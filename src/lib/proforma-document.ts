import { addDays, QUOTE_VALID_DAYS } from './billing'
import { both, country, documentPage, escapeHtml, money, NASHER, sumRow } from './billing-document'
import {
  lineTotal,
  orderTotal,
  paymentSplit,
  type OrderItem,
  type PaymentTerms,
} from './product-order'

/**
 * The proforma invoice of a product order, issued by Nasher: the products
 * and final prices the team entered under "Order and prices", and Nasher's
 * two bank accounts. The client hands it to their bank to pay for the goods.
 * Served by GET /api/applications/:id/proforma, printed to PDF like the HiGP
 * quote and invoices, and in the same Chinese and English template.
 */

type Pair = readonly [string, string]

const L = {
  title: ['Proforma Invoice', '形式发票'],
  number: ['Proforma No.', '形式发票号'],
  date: ['Date', '日期'],
  validUntil: ['Valid until', '有效期至'],
  currency: ['Currency', '币种'],
  buyer: ['Buyer', '买方'],
  product: ['Product', '品名'],
  qty: ['Qty', '数量'],
  unitPrice: ['Unit price', '单价'],
  amount: ['Amount', '金额'],
  total: ['Total', '合计'],
  origin: ['Country of origin', '原产国'],
  china: ['China', '中国'],
  destination: ['Destination', '目的国'],
  amountDue: ['Amount due', '应付金额'],
  terms: ['Payment terms', '付款方式'],
  depositNow: ['Deposit due now', '本次应付定金'],
  balance: ['Balance before shipment', '发货前应付尾款'],
  purpose: ['Purpose of transfer', '汇款用途'],
  goods: ['Purchase of goods', '货款'],
  transferNote: [
    'Please write the proforma invoice number in the transfer note.',
    '转账时请在备注中填写形式发票号。',
  ],
} as const satisfies Record<string, Pair>

const TERMS: Record<PaymentTerms, Pair> = {
  full: ['Full payment', '全额付款'],
  '50-50': ['50% deposit, 50% before shipment', '50% 定金，50% 发货前付清'],
  '30-70': ['30% deposit, 70% before shipment', '30% 定金，70% 发货前付清'],
}

const CURRENCIES: Record<string, Pair> = {
  usd: ['Prices in US dollars (USD).', '价格以美元计。'],
  cny: ['Prices in Chinese yuan (CNY).', '价格以人民币计。'],
  aed: ['Prices in UAE dirhams (AED).', '价格以阿联酋迪拉姆计。'],
  sar: ['Prices in Saudi riyals (SAR).', '价格以沙特里亚尔计。'],
}

const UNITS: Record<string, Pair> = {
  pieces: ['pieces', '件'],
  sets: ['sets', '套'],
  pairs: ['pairs', '双'],
  cartons: ['cartons', '箱'],
  metres: ['metres', '米'],
  kg: ['kg', '千克'],
}

/** PI-<reference>. */
export const proformaNumber = (reference: string) => `PI-${reference}`

export type ProformaDocument = {
  reference: string
  /** YYYY-MM-DD, the day it is issued. */
  date: string
  /** One of ORDER_CURRENCIES. */
  currency: string
  /** One of PAYMENT_TERMS; anything else prints as full payment. */
  terms?: string | null
  items: OrderItem[]
  buyer: {
    name: string
    company?: string | null
    address?: string | null
    country?: string | null
    whatsapp: string
    email?: string | null
  }
  destination?: string | null
  nonce: string | null
  copyUrl?: string
}

/** Null while a product has no quantity or price: there is nothing to print yet. */
export function renderProforma(doc: ProformaDocument): string | null {
  const total = orderTotal(doc.items)
  if (total === null) return null
  const code = doc.currency.toUpperCase()
  const number = proformaNumber(doc.reference)

  const buyer = [
    doc.buyer.company && `<bdi>${escapeHtml(doc.buyer.company)}</bdi>`,
    doc.buyer.address && `<bdi>${escapeHtml(doc.buyer.address)}</bdi>`,
    `<bdi>${escapeHtml(doc.buyer.name)}</bdi>`,
    doc.buyer.country && escapeHtml(country(doc.buyer.country)),
    `WhatsApp <span dir="ltr">${escapeHtml(doc.buyer.whatsapp)}</span>`,
    doc.buyer.email && escapeHtml(doc.buyer.email),
  ].filter((line): line is string => Boolean(line))

  const rows = [...doc.items]
    .map((item, i) => {
      const unit = UNITS[item.unit ?? '']
      return `<tr>
        <td>${i + 1}. <bdi class="zh">${escapeHtml(item.productName)}</bdi>${
          item.description?.trim()
            ? `<br><small>${escapeHtml(item.description.trim()).replace(/\n/g, '<br>')}</small>`
            : ''
        }</td>
        <td class="num">${(item.quantity ?? 0).toLocaleString('en-US')}${unit ? ` <small>${escapeHtml(unit[1])} ${escapeHtml(unit[0])}</small>` : ''}</td>
        <td class="num">${money(item.unitPrice ?? 0, code)}</td>
        <td class="num">${money(lineTotal(item) ?? 0, code)}</td>
      </tr>`
    })
    .join('')

  const terms: PaymentTerms = doc.terms === '50-50' || doc.terms === '30-70' ? doc.terms : 'full'
  const split = paymentSplit(total, terms)
  const percent = (share: number) => ` (${Math.round(share * 100)}%)`

  const fact = (label: Pair, value: string, strong = false) =>
    `<div${strong ? ' class="strong"' : ''}><span>${both(label)}</span><b>${value}</b></div>`

  return documentPage({
    issuer: NASHER,
    title: L.title,
    number,
    meta: [
      [L.number, number],
      [L.date, doc.date],
      [L.validUntil, addDays(doc.date, QUOTE_VALID_DAYS)],
      [L.currency, code],
    ],
    partyLabel: L.buyer,
    party: buyer,
    partyColumns: true,
    body: `<table class="lines">
  <thead><tr><th>${both(L.product)}</th><th class="num">${both(L.qty)}</th><th class="num">${both(L.unitPrice)}</th><th class="num">${both(L.amount)}</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>${sumRow(L.total, total, true, code)}</tfoot>
</table>
<section class="box">
  <div class="facts">
    ${fact(L.origin, both(L.china))}
    ${doc.destination ? fact(L.destination, escapeHtml(country(doc.destination))) : ''}
    ${fact(L.purpose, both(L.goods))}
    ${fact(L.terms, both(TERMS[terms]))}
  </div>
  <table class="sums">
    ${
      terms === 'full'
        ? sumRow(L.amountDue, total, true, code)
        : `<tr class="strong"><th colspan="3">${both(L.depositNow)}${percent(split.share)}</th><td class="num">${money(split.deposit, code)}</td></tr>
    <tr><th colspan="3">${both(L.balance)}${percent(1 - split.share)}</th><td class="num">${money(split.balance, code)}</td></tr>`
    }
  </table>
  <p class="note">${both(L.transferNote)} ${both(CURRENCIES[doc.currency] ?? [code, code])}</p>
</section>`,
    nonce: doc.nonce,
    copyUrl: doc.copyUrl,
  })
}
