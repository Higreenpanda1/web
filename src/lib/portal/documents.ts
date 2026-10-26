import { billLines, type BillingItem, type InvoiceStage } from '../billing.ts'

import type { Progress } from './stages.ts'

/**
 * Which of a request's quote and invoices its client may download. The team
 * builds them on the site (src/lib/billing-document.ts); the portal only
 * offers ones that have really been given to the client, so a quote being
 * drafted stays private:
 *
 *   - the quote, once the deal has reached "Quote Sent" (or anything later);
 *   - an invoice, once its payment is recorded, or — for the balance — once
 *     the service is completed and the deposit was paid, which is when the
 *     balance falls due.
 *
 * Only HiGP service requests have these; product orders (Nasher) have their
 * own proforma, which is not in the portal yet.
 */

export type PortalDocument =
  | { kind: 'quote' }
  | { kind: 'invoice'; stage: InvoiceStage; paidOn: string | null }

export type BillingData = {
  items?: BillingItem[] | null
  paidDeposit?: string | null
  paidBalance?: string | null
  paidFull?: string | null
} | null

export function portalDocuments(
  type: string,
  billing: BillingData | undefined,
  progress: Progress,
): PortalDocument[] {
  if (type === 'product-search' || type === 'shipping-quote') return []
  if (!billing || billLines(billing.items ?? []).length === 0) return []

  const docs: PortalDocument[] = []
  const quoteStep = progress.steps.indexOf('quote')
  const quoted =
    (!progress.stopped && quoteStep >= 0 && progress.current >= quoteStep) ||
    Boolean(billing.paidDeposit || billing.paidBalance || billing.paidFull)
  if (quoted) docs.push({ kind: 'quote' })

  const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null)
  if (billing.paidFull) {
    docs.push({ kind: 'invoice', stage: 'full', paidOn: day(billing.paidFull) })
    return docs
  }
  if (billing.paidDeposit) {
    docs.push({ kind: 'invoice', stage: 'deposit', paidOn: day(billing.paidDeposit) })
    const completed = progress.closed && !progress.stopped
    if (billing.paidBalance || completed) {
      docs.push({ kind: 'invoice', stage: 'balance', paidOn: day(billing.paidBalance) })
    }
  }
  return docs
}
