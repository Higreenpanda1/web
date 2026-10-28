import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  checkDocuments,
  checkFileSet,
  EMAIL_ATTACHMENT_BUDGET,
  MAX_DOCUMENT_BYTES,
  sniffMime,
  withinEmailBudget,
} from './documents.ts'

import { FORMS, type FieldDef } from '../forms/definitions.ts'

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])
const PDF = new TextEncoder().encode('%PDF-1.7\n')
const HTML = new TextEncoder().encode('<html><script>alert(1)</script>')

const file = (bytes: Uint8Array, name = 'photo.jpg', size = bytes.byteLength) => ({
  name,
  size,
  arrayBuffer: async () =>
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
})

const fields: FieldDef[] = [
  { name: 'passport', kind: 'file', required: true, accept: ['image/jpeg', 'application/pdf'] },
  { name: 'entryStamp', kind: 'file', accept: ['image/jpeg', 'application/pdf'] },
  { name: 'fullName', kind: 'text', required: true },
]
const visible = () => true

test('the type comes from the bytes, not the name', () => {
  assert.equal(sniffMime(JPEG), 'image/jpeg')
  assert.equal(sniffMime(PDF), 'application/pdf')
  assert.equal(sniffMime(HTML), null)
})

test('a passport is required, the entry stamp is not', async () => {
  const empty = file(new Uint8Array(), '', 0)
  const result = await checkDocuments(
    fields,
    (n) => (n === 'passport' ? empty : undefined),
    visible,
  )
  assert.deepEqual(result, { ok: false, errors: { passport: 'required' } })
})

test('a disguised file and an oversized file are refused', async () => {
  const result = await checkDocuments(
    fields,
    (n) =>
      n === 'passport'
        ? file(HTML, 'passport.jpg')
        : file(JPEG, 'stamp.jpg', MAX_DOCUMENT_BYTES + 1),
    visible,
  )
  assert.deepEqual(result, {
    ok: false,
    errors: { passport: 'fileType', entryStamp: 'fileTooBig' },
  })
})

test('good files come back with a safe extension', async () => {
  const result = await checkDocuments(
    fields,
    (n) => (n === 'passport' ? file(PDF, '../../etc/passwd.pdf') : file(JPEG)),
    visible,
  )
  assert.ok(result.ok)
  assert.deepEqual(
    result.documents.map((d) => [d.field, d.extension, d.mime]),
    [
      ['passport', 'pdf', 'application/pdf'],
      ['entryStamp', 'jpg', 'image/jpeg'],
    ],
  )
})

const productFields = FORMS['product-search'].steps.find((step) => step.repeat)?.fields ?? []
const field = (name: string) => {
  const found = productFields.find((f) => f.name === name)
  assert.ok(found, name)
  return found
}

test('a product needs one to five photos, numbered in order, and nothing but photos', async () => {
  const photos = field('photos')
  const empty = file(new Uint8Array(), '', 0)
  assert.deepEqual(await checkFileSet(photos, [empty], 'product1-photos-'), {
    documents: [],
    error: 'photosRequired',
  })

  const two = await checkFileSet(photos, [file(JPEG), file(JPEG)], 'product2-photos-')
  assert.equal(two.error, null)
  assert.deepEqual(
    two.documents.map((d) => d.field),
    ['product2-photos-1', 'product2-photos-2'],
  )

  const six = await checkFileSet(
    photos,
    Array.from({ length: 6 }, () => file(JPEG)),
    'p-',
  )
  assert.equal(six.error, 'tooManyFiles')
  assert.equal((await checkFileSet(photos, [file(PDF, 'a.pdf')], 'p-')).error, 'photoType')
})

const zip = (...names: string[]) =>
  new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new TextEncoder().encode(names.join('\0'))])
const XLSX = zip('[Content_Types].xml', 'xl/workbook.xml')
const DOCX = zip('[Content_Types].xml', 'word/document.xml')
const utf16 = (text: string) => Array.from(text).flatMap((c) => [c.charCodeAt(0), 0])
const XLS = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, ...utf16('Workbook')])
const DOC = new Uint8Array([
  0xd0,
  0xcf,
  0x11,
  0xe0,
  0xa1,
  0xb1,
  0x1a,
  0xe1,
  ...utf16('WordDocument'),
])

test('a spreadsheet is told from other Office files by what it holds', () => {
  assert.equal(sniffMime(XLSX), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  assert.equal(sniffMime(XLS), 'application/vnd.ms-excel')
  assert.equal(sniffMime(DOCX), null)
  assert.equal(sniffMime(DOC), null)
})

test('a product may also carry up to three Excel or PDF files, with their own errors', async () => {
  const sheets = field('productFiles')
  const empty = file(new Uint8Array(), '', 0)
  assert.deepEqual(await checkFileSet(sheets, [empty], 'p-'), { documents: [], error: null })

  const good = await checkFileSet(
    sheets,
    [file(XLSX, 'list.xlsx'), file(PDF, 'spec.pdf'), file(XLS, 'old.xls')],
    'product1-productFiles-',
  )
  assert.equal(good.error, null)
  assert.deepEqual(
    good.documents.map((d) => [d.field, d.extension]),
    [
      ['product1-productFiles-1', 'xlsx'],
      ['product1-productFiles-2', 'pdf'],
      ['product1-productFiles-3', 'xls'],
    ],
  )

  assert.equal((await checkFileSet(sheets, [file(JPEG)], 'p-')).error, 'sheetType')
  assert.equal((await checkFileSet(sheets, [file(DOCX, 'a.docx')], 'p-')).error, 'sheetType')
  assert.equal(
    (
      await checkFileSet(
        sheets,
        Array.from({ length: 4 }, () => file(PDF)),
        'p-',
      )
    ).error,
    'tooManySheets',
  )
  assert.equal(
    (await checkFileSet(sheets, [file(PDF, 'big.pdf', MAX_DOCUMENT_BYTES + 1)], 'p-')).error,
    'sheetTooBig',
  )
})

test('the email attaches files while they fit and names the rest', () => {
  const file = (filename: string, mb: number) => ({
    filename,
    content: new Uint8Array(mb * 1024 * 1024),
  })
  const { attached, skipped } = withinEmailBudget([
    file('passport.pdf', 9),
    file('degree.pdf', 10),
    file('police.pdf', 10),
    file('photo.jpg', 1),
  ])
  assert.deepEqual(
    attached.map((f) => f.filename),
    ['passport.pdf', 'degree.pdf', 'photo.jpg'],
  )
  assert.deepEqual(skipped, ['police.pdf'])
  assert.ok(EMAIL_ATTACHMENT_BUDGET < 30 * 1024 * 1024)
})
