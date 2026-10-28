import { createHash } from 'node:crypto'

import type { PayloadRequest } from 'payload'

import { billingChoice, buildDocument, type DocumentChoice } from './application-documents'
import { attachToDeal } from './hubspot'
import { htmlToPdf } from './pdf'

import type { Application } from '@/payload-types'

/**
 * Puts a PDF of a printed quote, invoice or proforma into the request's
 * HubSpot deal, as a note:
 *
 *   Quote Q-HGA-… copied from the website / 报价单 Q-HGA-… 已从网站保存
 *
 * Wording approved by the owner on 27 Oct 2026. Called by the print button
 * on those pages (POST /api/applications/:id/hubspot-copy), so it happens
 * when the team prints the page to send it to the client.
 *
 * Once per version: the content (without the date, which changes every day)
 * is hashed, and a page whose hash is already recorded in `hubspotCopies` is
 * not sent again. A page printed after the prices changed is a new version
 * and gets its own note.
 */

export type CopyResult = { ok: true; copied: boolean } | { ok: false; error: string }

/** ?doc=quote|invoice|proforma&stage=… */
export function copyChoice(params: URLSearchParams | undefined): DocumentChoice {
  if (params?.get('doc') === 'proforma') return { doc: 'proforma' }
  if (params?.get('doc') === 'invoice') {
    return billingChoice(new URLSearchParams({ kind: 'invoice', stage: params.get('stage') ?? '' }))
  }
  return { doc: 'quote' }
}

export function noteText(label: readonly [string, string], number: string): string {
  return `${label[0]} ${number} copied from the website / ${label[1]} ${number} 已从网站保存`
}

const VERSION_DATE = '2000-01-01'

export async function copyDocumentToHubSpot(
  req: PayloadRequest,
  application: Application,
): Promise<CopyResult> {
  const dealId = application.hubspotDealId
  if (!dealId) {
    return {
      ok: false,
      error: 'Not copied: this request has no HubSpot deal. Press "Resend to HubSpot" first.',
    }
  }
  const choice = copyChoice(req.searchParams)

  const version = buildDocument(application, choice, { date: VERSION_DATE, nonce: null })
  if ('error' in version) return { ok: false, error: version.error }
  const hash = createHash('sha256').update(version.html).digest('hex').slice(0, 16)
  const copies = (application.hubspotCopies ?? {}) as Record<string, string>
  if (copies[version.number] === hash) return { ok: true, copied: false }

  // Dated like the page the team printed. The file name carries Shanghai
  // time, which keeps two versions printed the same day apart.
  const today = buildDocument(application, choice, {
    date: new Date().toISOString().slice(0, 10),
    nonce: null,
  })
  const stamp = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 16)
  if ('error' in today) return { ok: false, error: today.error }

  try {
    const pdf = await htmlToPdf(today.html)
    await attachToDeal(
      dealId,
      application.reference,
      {
        filename: `${today.number} (${stamp.replace('T', ' ').replace(':', '.')}).pdf`,
        mime: 'application/pdf',
        content: pdf,
      },
      noteText(today.label, today.number),
    )
  } catch (error) {
    console.error(`[application ${application.reference}] HubSpot copy failed`, error)
    return {
      ok: false,
      error: `Not copied to HubSpot: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  await req.payload.update({
    collection: 'applications',
    id: application.id,
    data: { hubspotCopies: { ...copies, [version.number]: hash } },
    req,
  })
  return { ok: true, copied: true }
}
