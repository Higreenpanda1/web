import assert from 'node:assert/strict'
import { test } from 'node:test'

import { checkDocuments, MAX_DOCUMENT_BYTES, sniffMime } from './documents.ts'

import type { FieldDef } from '../forms/definitions.ts'

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
