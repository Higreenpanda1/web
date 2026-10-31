import {
  billLines,
  billSums,
  type Payment,
  type PaymentPlan,
  documentNumber,
  INVOICE_STAGES,
  type BillingItem,
  type InvoiceStage,
} from './billing'
import { HIGP, renderBillingDocument, documentPage, escapeHtml, sumRow } from './billing-document'
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
  | { doc: 'receipt'; payment: string }
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
  if (params?.get('kind') === 'receipt')
    return { doc: 'receipt', payment: params.get('payment') ?? '' }
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
  const billing = application.billing
  const payments = (billing?.payments ?? []) as Payment[]
  const received = payments.length
    ? Math.round(payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100
    : undefined
  const paymentPlan: PaymentPlan = {
    fullDiscount: billing?.depositPlan === 'full' || Boolean(billing?.paidFull),
    depositPercent: billing?.depositPlan === '30' ? 30 : 50,
    depositAmount:
      billing?.depositPlan === 'custom' ? (billing.customDeposit ?? undefined) : undefined,
    received,
  }
  const sums = billSums(lines, paymentPlan)
  if (
    billing?.depositPlan === 'custom' &&
    (billing.customDeposit == null ||
      billing.customDeposit <= 0 ||
      billing.customDeposit > sums.total)
  ) {
    return {
      error: 'Enter a custom payment greater than zero and no more than the total, then save.',
    }
  }
  const payable = paymentPlan.fullDiscount ? sums.full : sums.total
  if (choice.doc === 'receipt') {
    const index = payments.findIndex((p) => p.id === choice.payment)
    const payment = payments[index]
    if (!payment) return { error: 'Save a received payment first, then open its receipt.' }
    const cumulative =
      Math.round(payments.slice(0, index + 1).reduce((sum, p) => sum + p.amount, 0) * 100) / 100
    const number = `RCPT-${application.reference}-${payment.id?.slice(-8)}`
    const methods = {
      cash: 'Cash / 现金',
      bank: 'Bank transfer / 银行转账',
      wechat: 'WeChat Pay / 微信支付',
      alipay: 'Alipay / 支付宝',
      other: 'Other / 其他',
    }
    return {
      number,
      label: ['Payment receipt', '收款收据'],
      html: documentPage({
        issuer: HIGP,
        title: ['Payment receipt', '收款收据'],
        number,
        meta: [
          [['Receipt No.', '收据编号'], number],
          [['Request No.', '申请编号'], application.reference],
          [
            ['Date received', '收款日期'],
            new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Shanghai',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(new Date(payment.paidOn)),
          ],
          [['Payment method', '付款方式'], methods[payment.method]],
          [['Received by', '收款人'], payment.receivedBy],
        ],
        partyLabel: ['Received from', '付款人'],
        party: [application.name, billing?.clientCompany, application.whatsapp, application.email]
          .filter((v): v is string => Boolean(v))
          .map(escapeHtml),
        body: `<section class="box"><table class="sums">${sumRow(['Amount received', '本次实收'], payment.amount, true)}${sumRow(['Total payable', '应付总额'], payable)}${sumRow(['Total received through this receipt', '截至本收据累计已收'], cumulative)}${sumRow(['Remaining balance', '剩余应付'], Math.max(0, payable - cumulative), true)}${cumulative > payable ? sumRow(['Overpayment / credit', '多付余额'], cumulative - payable) : ''}</table>${payment.reference ? `<p>${escapeHtml(payment.reference)}</p>` : ''}</section>`,
        hidePaymentDetails: true,
        nonce: page.nonce,
        copyUrl: page.copyUrl,
      }),
    }
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
    paymentPlan,
    paidOn: choice.doc === 'invoice' && !payments.length ? (paidOn?.slice(0, 10) ?? null) : null,
    nonce: page.nonce,
    copyUrl: page.copyUrl,
  })
  return choice.doc === 'quote'
    ? { html, number: documentNumber(application.reference, 'quote'), label: ['Quote', '报价单'] }
    : { html, number: documentNumber(application.reference, stage), label: ['Invoice', '账单'] }
}
