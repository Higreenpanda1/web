import {
  billLines,
  documentNumber,
  INVOICE_STAGES,
  type BillingItem,
  type InvoiceStage,
} from './billing'
import { HIGP, renderBillingDocument } from './billing-document'
import { proformaNumber, renderProforma } from './proforma-document'
import type { OrderItem } from './product-order'

import type { Application } from '@/payload-types'

/**
 * The quote, invoices and proforma of one request, built from what the team
 * entered in the admin. Shared by the pages the team prints
 * (GET /api/applications/:id/document and /proforma) and by the copy that
 * goes into the client's HubSpot deal (POST /api/applications/:id/hubspot-copy),
 * so the PDF in HubSpot is the page the team printed.
 */

export type DocumentChoice =
  | { doc: 'quote' }
  | { doc: 'invoice'; stage: InvoiceStage }
  | { doc: 'proforma' }

export type BuiltDocument = {
  html: string
  /** Q-…, INV-…-D/B/F or PI-…, which is also the PDF's name. */
  number: string
  /** For the HubSpot note, [English, 中文]. */
  label: readonly [string, string]
}

const isProductRequest = (data: Partial<Application> | undefined) => data?.type === 'product-search'

/** HiGP services: every request that is not for products or shipping (those are Nasher's). */
const isServiceRequest = (data: Partial<Application> | undefined) =>
  !!data?.type && data.type !== 'product-search' && data.type !== 'shipping-quote'

/** The document the query string asks for: ?kind=invoice&stage=…, else the quote. */
export function billingChoice(params: URLSearchParams | undefined): DocumentChoice {
  if (params?.get('kind') !== 'invoice') return { doc: 'quote' }
  const asked = params.get('stage') ?? ''
  const stage: InvoiceStage = (INVOICE_STAGES as readonly string[]).includes(asked)
    ? (asked as InvoiceStage)
    : 'deposit'
  return { doc: 'invoice', stage }
}

const text = (value: unknown) => (typeof value === 'string' && value.trim()) || null

/**
 * The page, or the reason there is none yet (shown to the team as is).
 * `copyUrl` makes the print button also send the page to HubSpot.
 */
export function buildDocument(
  application: Application,
  choice: DocumentChoice,
  page: { date: string; nonce: string | null; copyUrl?: string },
): BuiltDocument | { error: string } {
  const details = (application.details ?? {}) as Record<string, unknown>

  if (choice.doc === 'proforma') {
    if (!isProductRequest(application)) {
      return { error: 'Only product requests have a proforma invoice.' }
    }
    const html = renderProforma({
      reference: application.reference,
      date: page.date,
      currency: application.order?.currency ?? 'usd',
      terms: application.order?.paymentTerms,
      items: (application.order?.items ?? []) as OrderItem[],
      buyer: {
        name: application.name,
        company: text(details.companyName),
        address: text(details.companyAddress),
        country: application.country,
        whatsapp: application.whatsapp,
        email: application.email,
      },
      destination: text(details.destinationCountry),
      nonce: page.nonce,
      copyUrl: page.copyUrl,
    })
    if (!html) {
      return {
        error:
          'Enter a quantity and a unit price for every product under "Order and prices" and save first.',
      }
    }
    return {
      html,
      number: proformaNumber(application.reference),
      label: ['Proforma invoice', '形式发票'],
    }
  }

  if (!isServiceRequest(application)) {
    return { error: 'Only service requests have a quote.' }
  }
  const lines = billLines((application.billing?.items ?? []) as BillingItem[])
  if (lines.length === 0) {
    return { error: 'Add the services under "Quote and invoice" and save first.' }
  }
  const stage = choice.doc === 'invoice' ? choice.stage : 'deposit'
  const paidOn = {
    deposit: application.billing?.paidDeposit,
    balance: application.billing?.paidBalance,
    full: application.billing?.paidFull,
  }[stage]
  const html = renderBillingDocument({
    issuer: HIGP,
    kind: choice.doc,
    stage,
    reference: application.reference,
    date: page.date,
    client: {
      name: application.name,
      company: application.billing?.clientCompany || text(details.companyName),
      country: application.country,
      whatsapp: application.whatsapp,
      email: application.email,
    },
    lines,
    paidOn: choice.doc === 'invoice' ? (paidOn?.slice(0, 10) ?? null) : null,
    nonce: page.nonce,
    copyUrl: page.copyUrl,
  })
  return choice.doc === 'quote'
    ? { html, number: documentNumber(application.reference, 'quote'), label: ['Quote', '报价单'] }
    : { html, number: documentNumber(application.reference, stage), label: ['Invoice', '账单'] }
}
