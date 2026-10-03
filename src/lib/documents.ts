import type { FieldDef } from '@/forms/definitions'

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

export type DocumentMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

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
}

/** What the file really is, from its signature. Null when it is none of ours. */
export function sniffMime(bytes: Uint8Array): DocumentMime | null {
  const at = (offset: number, ...expected: number[]) =>
    expected.every((value, i) => bytes[offset + i] === value)
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp'
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf'
  return null
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
      if (field.required) errors[field.name] = 'required'
      continue
    }
    if (value.size > MAX_DOCUMENT_BYTES) {
      errors[field.name] = 'fileTooBig'
      continue
    }
    const bytes = new Uint8Array(await value.arrayBuffer())
    const mime = sniffMime(bytes)
    const allowed = field.accept ?? Object.keys(EXTENSIONS)
    if (!mime || !allowed.includes(mime)) {
      errors[field.name] = 'fileType'
      continue
    }
    documents.push({
      field: field.name,
      extension: EXTENSIONS[mime],
      mime,
      bytes,
      originalName: value.name.slice(0, 200),
    })
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, documents }
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
