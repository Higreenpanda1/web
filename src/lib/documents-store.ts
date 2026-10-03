import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { documentFileName, type CheckedDocument } from './documents'

/**
 * Where application documents are kept on the server.
 *
 * Inside the media volume so the nightly backup carries them and a redeploy
 * never loses them, but in a folder of its own: Payload serves media only by
 * looking a file name up in the `media` table, and these files are never in
 * it, so no URL reaches them. The team gets them by email and in HubSpot.
 */
const MEDIA_DIR = process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media')
export const DOCUMENTS_DIR =
  process.env.DOCUMENTS_DIR || path.join(MEDIA_DIR, 'private', 'applications')

export type StoredDocument = {
  field: string
  file: string
  mime: string
  bytes: number
  originalName: string
}

/**
 * Writes the documents under DOCUMENTS_DIR/<yyyy-mm>/. Never throws: the
 * files also travel in the notification email, so a full disk must not lose
 * the application. Returns what was written.
 */
export async function storeDocuments(
  reference: string,
  documents: CheckedDocument[],
): Promise<StoredDocument[]> {
  if (documents.length === 0) return []
  const month = new Date().toISOString().slice(0, 7)
  const dir = path.join(DOCUMENTS_DIR, month)
  const stored: StoredDocument[] = []

  try {
    await mkdir(dir, { recursive: true, mode: 0o700 })
    for (const doc of documents) {
      const file = documentFileName(reference, doc)
      await writeFile(path.join(dir, file), doc.bytes, { mode: 0o600 })
      stored.push({
        field: doc.field,
        file: `${month}/${file}`,
        mime: doc.mime,
        bytes: doc.bytes.byteLength,
        originalName: doc.originalName,
      })
    }
  } catch (error) {
    console.error(`[application ${reference}] could not store documents`, error)
  }
  return stored
}
