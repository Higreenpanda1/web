import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { sniffMime } from './documents'
import { DOCUMENTS_DIR } from './documents-store'
import { documentMonths, isPhotoFileName } from './product-order'

/**
 * One product photo of a request, read from the private documents folder
 * for the admin and the printable brief. Only names the form writes for
 * this request are looked up (src/lib/product-order.ts), and the type is
 * taken from the bytes, so nothing else in the folder can be reached.
 */
export async function readOrderPhoto(
  reference: string,
  createdAt: string,
  file: string,
): Promise<{ content: Uint8Array; mime: string } | null> {
  if (!isPhotoFileName(file, reference)) return null
  for (const month of documentMonths(createdAt)) {
    try {
      const content = new Uint8Array(await readFile(path.join(DOCUMENTS_DIR, month, file)))
      const mime = sniffMime(content)
      return mime && mime !== 'application/pdf' ? { content, mime } : null
    } catch {
      // Not in this month's folder; try the one before.
    }
  }
  return null
}
