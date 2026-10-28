import type { FieldDef, FileErrorKey } from '@/forms/definitions'

/**
 * Identity documents uploaded with an application — the passport photo page
 * and, when the client has one, the China entry stamp.
 *
 * Until October 2026 the forms took no files at all (see the note in
 * src/collections/Applications.ts). The owner then asked for the passport and
 * entry stamp to come with the company-registration request, because
 * formation cannot start without them and chasing them on WhatsApp lost days.
 * The care that decision was protecting is kept here instead:
 *
 *   - the type is decided by the file's first bytes, never by its name or the
 *     type the browser claims, and only JPEG, PNG, WebP and PDF are accepted;
 *   - files are written to a private folder that no route serves — the team
 *     receives them as email attachments and in HubSpot;
 *   - each file is renamed to the field and reference, so a crafted file name
 *     never reaches the disk.
 *
 * This module only reads and checks; ./documents-store.ts writes.
 */

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const XLS_MIME = 'application/vnd.ms-excel'

export type DocumentMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'application/pdf'
  | typeof XLSX_MIME
  | typeof XLS_MIME

export type CheckedDocument = {
  field: string
  /** Name to give the file: `<reference>-<field>.<ext>`. */
  extension: string
  mime: DocumentMime
  bytes: Uint8Array
  originalName: string
}

export type DocumentCheck =
  | { ok: true; documents: CheckedDocument[] }
  | { ok: false; errors: Record<string, string> }

const EXTENSIONS: Record<DocumentMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  [XLSX_MIME]: 'xlsx',
  [XLS_MIME]: 'xls',
}

/** What the file really is, from its signature. Null when it is none of ours. */
export function sniffMime(bytes: Uint8Array): DocumentMime | null {
  const at = (offset: number, ...expected: number[]) =>
    expected.every((value, i) => bytes[offset + i] === value)
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp'
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf'
  // An .xlsx is a ZIP whose parts are named in the clear; it must hold a
  // workbook, so a Word file or any other ZIP is refused.
  if (at(0, 0x50, 0x4b, 0x03, 0x04) && contains(bytes, 'xl/workbook')) return XLSX_MIME
  // An old .xls is an OLE container with a "Workbook" (or "Book") stream,
  // its name written in UTF-16.
  if (
    at(0, 0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1) &&
    (contains(bytes, 'Workbook', true) || contains(bytes, 'Book', true))
  ) {
    return XLS_MIME
  }
  return null
}

/**
 * The field's own error key, when it names one. The same rule as `errorKey`
 * in src/forms/definitions.ts, repeated so this module imports types only
 * and the unit tests can load it.
 */
const errorKey = (field: FieldDef, key: FileErrorKey): string => field.errorKeys?.[key] ?? key

/** Whether the ASCII text appears in the bytes, optionally as UTF-16LE. */
function contains(bytes: Uint8Array, text: string, utf16 = false): boolean {
  const needle = Array.from(text).flatMap((char) =>
    utf16 ? [char.charCodeAt(0), 0] : [char.charCodeAt(0)],
  )
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer
    return true
  }
  return false
}

/** The minimal shape of a browser File that this needs; FormData gives real Files. */
export type UploadedFile = { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }

function isUploadedFile(value: unknown): value is UploadedFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as UploadedFile).arrayBuffer === 'function' &&
    typeof (value as UploadedFile).size === 'number'
  )
}

/**
 * Reads every visible `file` field of a form. An empty file input arrives as
 * a File of size 0 with an empty name, which counts as "not given".
 * Error values are catalogue keys under `apply.errors.*`.
 */
export async function checkDocuments(
  fields: readonly FieldDef[],
  get: (name: string) => unknown,
  isVisible: (field: FieldDef) => boolean,
): Promise<DocumentCheck> {
  const documents: CheckedDocument[] = []
  const errors: Record<string, string> = {}

  for (const field of fields) {
    if (field.kind !== 'file' || !isVisible(field)) continue
    const value = get(field.name)
    const given = isUploadedFile(value) && value.size > 0

    if (!given) {
      if (field.required) errors[field.name] = errorKey(field, 'required')
      continue
    }
    const checked = await checkFile(field, value, field.name)
    if (typeof checked === 'string') errors[field.name] = checked
    else documents.push(checked)
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, documents }
}

/**
 * Reads a `file` field that takes several files, such as the photos of one
 * product. The files are named `<stem>1`, `<stem>2`... in the order chosen.
 * One error for the whole set, under the form name; null when all is well.
 */
export async function checkFileSet(
  field: FieldDef,
  values: readonly unknown[],
  stem: string,
): Promise<{ documents: CheckedDocument[]; error: string | null }> {
  const given = values.filter(
    (value): value is UploadedFile => isUploadedFile(value) && value.size > 0,
  )
  if (given.length === 0) {
    return { documents: [], error: field.required ? errorKey(field, 'required') : null }
  }
  if (given.length > (field.multiple ?? 1)) {
    return { documents: [], error: errorKey(field, 'tooManyFiles') }
  }

  const documents: CheckedDocument[] = []
  for (const [index, value] of given.entries()) {
    const checked = await checkFile(field, value, `${stem}${index + 1}`)
    if (typeof checked === 'string') return { documents: [], error: checked }
    documents.push(checked)
  }
  return { documents, error: null }
}

/** One file, checked by its size and its first bytes. A string is an error key. */
async function checkFile(
  field: FieldDef,
  value: UploadedFile,
  name: string,
): Promise<CheckedDocument | string> {
  if (value.size > MAX_DOCUMENT_BYTES) return errorKey(field, 'fileTooBig')
  const bytes = new Uint8Array(await value.arrayBuffer())
  const mime = sniffMime(bytes)
  const allowed = field.accept ?? Object.keys(EXTENSIONS)
  if (!mime || !allowed.includes(mime)) {
    return errorKey(field, 'fileType')
  }
  return {
    field: name,
    extension: EXTENSIONS[mime],
    mime,
    bytes,
    originalName: value.name.slice(0, 200),
  }
}

export function documentFileName(reference: string, doc: CheckedDocument): string {
  return `${reference}-${doc.field}.${doc.extension}`
}

/** "2.4 MB" — for the answers table. */
export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * Resend refuses an email over 40 MB, and base64 makes attachments a third
 * larger. Attach files in order while they fit in 25 MB; the rest are named in
 * the email and stay in the private folder on the server.
 */
export const EMAIL_ATTACHMENT_BUDGET = 25 * 1024 * 1024

export function withinEmailBudget<T extends { filename: string; content: Uint8Array }>(
  files: readonly T[],
): { attached: T[]; skipped: string[] } {
  const attached: T[] = []
  const skipped: string[] = []
  let total = 0
  for (const file of files) {
    if (total + file.content.byteLength > EMAIL_ATTACHMENT_BUDGET) {
      skipped.push(file.filename)
      continue
    }
    total += file.content.byteLength
    attached.push(file)
  }
  return { attached, skipped }
}
