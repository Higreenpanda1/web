import { HEADQUARTERS } from './company'
import { PRIORITY_COUNTRIES, OTHER_COUNTRIES, countryName } from './countries'
import {
  addDays,
  billSums,
  documentNumber,
  INVOICE_DUE_DAYS,
  QUOTE_VALID_DAYS,
  type BillLine,
  type InvoiceStage,
} from './billing'

/**
 * The printable quote and invoices, in Chinese and English, opened from a
 * request in the admin and served by GET /api/applications/:id/document.
 * The team prints them to PDF and sends them on WhatsApp.
 *
 * One template for every company we bill from: the issuer carries the name,
 * address, bank details and payment codes. HiGP bills services today; the
 * Nasher proforma for product orders is meant to reuse this with Nasher's
 * own details, read from the bank card image the owner sent, never retyped
 * from memory.
 *
 * Wording approved by the owner on 26 Oct 2026. Chinese and English only:
 * the owner chose those two for every quote and invoice.
 */

export type Issuer = {
  en: string
  zh: string
  addressEn: string
  addressZh: string
  contact: string
  /** Label pairs [English, 中文] and the value, in display order. */
  bank: Array<{ label: readonly [string, string]; value: string }>
  /** Payment codes under /public, with the account name the payer will see. */
  codes: Array<{ src: string; label: readonly [string, string] }>
}

/**
 * Copied from the owner's bank card for HiGP
 * (/mnt/project-files/product-orders/higp-bank-details.png, 26 Oct 2026).
 * The Alipay code on that card is in Nasher's name; the owner confirmed it
 * goes on HiGP's documents as it is.
 */
export const HIGP: Issuer = {
  en: 'Guangzhou HIGP International Business Services Co., Ltd.',
  zh: '广州海吉鹏国际商务服务有限公司',
  addressEn: (HEADQUARTERS.addressEn ?? []).join(', '),
  addressZh: HEADQUARTERS.addressZh ?? '',
  contact: 'WhatsApp +86 130 2344 0305 · contact@higreenpanda.com · higreenpanda.com',
  bank: [
    {
      label: ['Account name', '户名'],
      value:
        'Guangzhou HIGP International Business Services Co., Ltd.<br>广州海吉鹏国际商务服务有限公司',
    },
    {
      label: ['Bank', '开户行'],
      value:
        "Agricultural Bank of China, Guangzhou Hai'an Road Sub-branch<br>中国农业银行股份有限公司广州海安路支行",
    },
    { label: ['Account number', '账号'], value: '44-060001040016797' },
    { label: ['SWIFT / BIC', 'SWIFT / BIC'], value: 'ABOCCNBJ190' },
    { label: ['CNAPS code', 'CNAPS 行号'], value: '103581006000' },
    { label: ['Country', '国家'], value: 'China 中国' },
  ],
  codes: [
    { src: '/brand/pay/wechat-higp.png', label: ['WeChat Pay · HiGreenPanda', '微信支付'] },
    {
      src: '/brand/pay/alipay-nasher.png',
      label: ['Alipay · Nasher · credit cards accepted', '支付宝 · 那社尔 · 可用信用卡'],
    },
  ],
}

type Pair = readonly [string, string]

const L = {
  quote: ['Quotation', '报价单'],
  invoice: ['Invoice', '账单'],
  quoteNo: ['Quote No.', '报价单号'],
  invoiceNo: ['Invoice No.', '账单号'],
  date: ['Date', '日期'],
  validUntil: ['Valid until', '有效期至'],
  dueDate: ['Due date', '付款截止日期'],
  preparedFor: ['Prepared for', '客户'],
  billTo: ['Bill to', '付款方'],
  service: ['Service', '服务项目'],
  qty: ['Qty', '数量'],
  unitPrice: ['Unit price', '单价'],
  amount: ['Amount', '金额'],
  perYear: ['per year', '每年'],
  total: ['Total', '合计'],
  terms: ['Payment terms', '付款方式'],
  optionDeposit: ['Pay 50% now', '先付 50% 定金'],
  optionDepositLater: ['Balance when the service is completed', '余款在服务完成时支付'],
  optionFull: ['Or pay in full now, 3.5% off', '或一次性全额付款，享 3.5% 优惠'],
  passThroughNote: [
    'The registered address is rent we pay on to the landlord, so it is paid in full with the first payment and is not split or discounted.',
    '注册地址费用为代付租金，须在首次付款时全额支付，不参与分期和折扣。',
  ],
  prices: [
    'Prices in Chinese yuan (CNY). Yearly services renew at the same price unless we tell you otherwise.',
    '价格以人民币计。年度服务每年按同一价格续费，如有变动会提前通知。',
  ],
  dueNow: ['Due now', '本次应付'],
  stage: {
    deposit: ['50% deposit', '定金 50%'],
    balance: ['50% balance', '尾款 50%'],
    full: ['Full amount (3.5% off)', '全额（已减 3.5%）'],
  },
  fees: ['Our fees', '服务费'],
  passThrough: ['Registered address (in full)', '注册地址（全额）'],
  half: ['50% of our fees', '服务费的 50%'],
  discount: ['3.5% off our fees', '服务费减 3.5%'],
  amountDue: ['Amount due', '应付金额'],
  transferNote: [
    'Please write the invoice number in the transfer note.',
    '转账时请在备注中填写账单号。',
  ],
  paid: ['PAID', '已付款'],
  paidOn: ['Paid on', '付款日期'],
  bank: ['Bank transfer (SWIFT)', '银行转账'],
  beneficiary: [
    'Please make sure the beneficiary name matches exactly as shown above.',
    '请确保收款人名称与上方完全一致。',
  ],
  scan: ['Or scan to pay', '也可扫码付款'],
  thanks: [
    'Thank you for choosing HiGreenPanda. Questions? Message us on WhatsApp.',
    '感谢您选择 HiGreenPanda。如有疑问，请通过 WhatsApp 联系我们。',
  ],
  print: ['Print / Save as PDF', '打印 / 保存为 PDF'],
} as const satisfies Record<string, Pair | Record<string, Pair>>

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Chinese over English, as two lines of one label. */
const both = ([english, chinese]: Pair) =>
  `<span class="zh">${escapeHtml(chinese)}</span> <span class="en">${escapeHtml(english)}</span>`

const inline = ([english, chinese]: Pair) =>
  english === chinese ? escapeHtml(english) : `${escapeHtml(chinese)} ${escapeHtml(english)}`

function money(amount: number): string {
  const whole = Number.isInteger(amount)
  return `CNY ${amount.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

function country(value: string | null | undefined): string {
  if (!value) return ''
  const found = [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES].find((c) =>
    [c.ar, c.en, countryName(c, 'zh')].includes(value),
  )
  return found ? `${countryName(found, 'zh')} ${found.en}` : value
}

export type BillingDocument = {
  issuer: Issuer
  kind: 'quote' | 'invoice'
  /** Invoices only. */
  stage?: InvoiceStage
  reference: string
  /** YYYY-MM-DD, the day it is issued. */
  date: string
  client: {
    name: string
    company?: string | null
    country?: string | null
    whatsapp: string
    email?: string | null
  }
  lines: BillLine[]
  /** Invoices only: YYYY-MM-DD when this payment came in. */
  paidOn?: string | null
  nonce: string | null
}

export function renderBillingDocument(doc: BillingDocument): string {
  const sums = billSums(doc.lines)
  const isQuote = doc.kind === 'quote'
  const stage = doc.stage ?? 'deposit'
  const number = documentNumber(doc.reference, isQuote ? 'quote' : stage)
  const title = isQuote ? L.quote : L.invoice

  const meta = isQuote
    ? [
        [L.quoteNo, number],
        [L.date, doc.date],
        [L.validUntil, addDays(doc.date, QUOTE_VALID_DAYS)],
      ]
    : [
        [L.invoiceNo, number],
        [L.quoteNo, documentNumber(doc.reference, 'quote')],
        [L.date, doc.date],
        [L.dueDate, addDays(doc.date, INVOICE_DUE_DAYS)],
      ]

  const client = [
    doc.client.name,
    doc.client.company,
    country(doc.client.country),
    `WhatsApp <span dir="ltr">${escapeHtml(doc.client.whatsapp)}</span>`,
    doc.client.email,
  ]
    .filter((line): line is string => Boolean(line))
    .map((line, i) => (i === 3 ? line : escapeHtml(line)))

  const lineRows = doc.lines
    .map(
      (line) => `<tr>
        <td>${line.zh ? `<span class="zh">${escapeHtml(line.zh)}</span> ` : ''}<span class="en">${escapeHtml(line.en)}</span>${
          line.yearly ? ` <span class="tag">${inline(L.perYear)}</span>` : ''
        }${line.description ? `<br><small>${escapeHtml(line.description)}</small>` : ''}</td>
        <td class="num">${line.quantity.toLocaleString('en-US')}</td>
        <td class="num">${money(line.unitPrice)}</td>
        <td class="num">${money(line.amount)}</td>
      </tr>`,
    )
    .join('')

  const sumRow = (label: Pair, amount: number, strong = false) =>
    `<tr${strong ? ' class="strong"' : ''}><th colspan="3">${both(label)}</th><td class="num">${money(amount)}</td></tr>`

  const hasPassThrough = sums.passThrough > 0

  const terms = isQuote
    ? `<section class="box">
        <h2>${both(L.terms)}</h2>
        <table class="sums">
          ${sumRow(L.optionDeposit, sums.deposit, true)}
          ${sumRow(L.optionDepositLater, sums.balance)}
          ${sumRow(L.optionFull, sums.full, true)}
        </table>
        ${hasPassThrough ? `<p class="note">${both(L.passThroughNote)}</p>` : ''}
      </section>`
    : `<section class="box">
        <h2>${both(L.dueNow)}: ${both(L.stage[stage])}</h2>
        <table class="sums">
          ${stage !== 'balance' && hasPassThrough ? sumRow(L.passThrough, sums.passThrough) : ''}
          ${stage === 'full' ? sumRow(L.fees, sums.fees) : ''}
          ${stage === 'full' ? sumRow(L.discount, -sums.discount) : ''}
          ${stage !== 'full' ? sumRow(L.half, stage === 'deposit' ? sums.deposit - sums.passThrough : sums.balance) : ''}
          ${sumRow(L.amountDue, sums[stage], true)}
        </table>
        <p class="note">${both(L.transferNote)}</p>
        ${doc.paidOn ? `<div class="stamp">${inline(L.paid)}<small>${inline(L.paidOn)} ${escapeHtml(doc.paidOn)}</small></div>` : ''}
      </section>`

  const bank = `<section class="pay">
      <div>
        <h2>${both(L.bank)}</h2>
        <table class="bank">${doc.issuer.bank
          .map((row) => `<tr><th>${both(row.label)}</th><td>${row.value}</td></tr>`)
          .join('')}</table>
        <p class="note">${both(L.beneficiary)}</p>
      </div>
      <div class="codes">
        <h2>${both(L.scan)}</h2>
        <div class="code-row">${doc.issuer.codes
          .map(
            (code) =>
              `<figure><img src="${escapeHtml(code.src)}" alt=""><figcaption>${inline(code.label)}</figcaption></figure>`,
          )
          .join('')}</div>
      </div>
    </section>`

  const printButton = doc.nonce
    ? `<button type="button" id="print">${inline(L.print)}</button>
       <script nonce="${escapeHtml(doc.nonce)}">document.getElementById('print').addEventListener('click',()=>window.print())</script>`
    : ''

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(number)} · ${inline(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${printButton}
<header>
  <img src="/brand/web/logo-wordmark@2x.png" alt="HiGreenPanda" class="logo">
  <div class="issuer">
    <b>${escapeHtml(doc.issuer.zh)}</b><br>${escapeHtml(doc.issuer.en)}
    <small>${escapeHtml(doc.issuer.addressZh)}<br>${escapeHtml(doc.issuer.addressEn)}<br>${escapeHtml(doc.issuer.contact)}</small>
  </div>
</header>
<div class="head">
  <h1>${both(title)}</h1>
  <table class="meta">${meta
    .map(
      ([label, value]) =>
        `<tr><th>${both(label as Pair)}</th><td>${escapeHtml(value as string)}</td></tr>`,
    )
    .join('')}</table>
</div>
<section class="client">
  <h2>${both(isQuote ? L.preparedFor : L.billTo)}</h2>
  <p>${client.join('<br>')}</p>
</section>
<table class="lines">
  <thead><tr><th>${both(L.service)}</th><th class="num">${both(L.qty)}</th><th class="num">${both(L.unitPrice)}</th><th class="num">${both(L.amount)}</th></tr></thead>
  <tbody>${lineRows}</tbody>
  <tfoot>${sumRow(L.total, sums.total, true)}</tfoot>
</table>
${terms}
<p class="note">${both(L.prices)}</p>
${bank}
<footer>${both(L.thanks)}</footer>
</body>
</html>`
}

const STYLE = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", -apple-system, "Segoe UI", Arial, sans-serif;
    color: #17221a; background: #fff; margin: 0 auto; max-width: 820px; padding: 24px 16px; line-height: 1.45; font-size: 13px; }
  .zh { font-weight: 600; }
  .en { color: #4a5a4e; }
  header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; border-bottom: 3px solid #378d42; padding-bottom: 12px; }
  .logo { height: 42px; width: auto; }
  .issuer { text-align: right; font-size: 12px; }
  .issuer small { display: block; color: #556; margin-top: 4px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: 18px 0 12px; }
  h1 { font-size: 24px; margin: 0; color: #12341b; }
  h1 .en { color: #276b34; font-weight: 400; }
  h2 { font-size: 14px; margin: 0 0 6px; color: #276b34; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 5px 8px; }
  .meta { width: auto; }
  .meta th { font-weight: 400; padding-left: 0; }
  .meta td { font-weight: 600; white-space: nowrap; }
  .client { margin-bottom: 14px; }
  .client p { margin: 0; }
  .lines thead th { background: #12341b; color: #fff; font-weight: 600; }
  .lines thead .en { color: #cfe9d3; }
  .lines tbody td { border-bottom: 1px solid #e3eee6; }
  .lines small { color: #667; }
  .num { text-align: right; white-space: nowrap; }
  .tag { display: inline-block; font-size: 11px; background: #e2f3e5; color: #276b34; border-radius: 4px; padding: 0 6px; }
  .strong th, .strong td { font-weight: 700; font-size: 14px; }
  tfoot th, tfoot td { border-top: 2px solid #12341b; }
  .box { position: relative; background: #f3f7f4; border: 1px solid #c9e8cd; border-radius: 8px; padding: 12px; margin: 16px 0 8px; break-inside: avoid; }
  .sums th { font-weight: 400; }
  .note { font-size: 12px; color: #556; margin: 6px 0; }
  .stamp { position: absolute; top: 50%; left: 56%; transform: translate(-50%, -50%) rotate(-8deg); border: 3px solid #378d42; color: #378d42; background: rgba(255,255,255,.85); border-radius: 8px; padding: 4px 14px; font-size: 20px; font-weight: 800; text-align: center; white-space: nowrap; }
  .stamp small { display: block; font-size: 11px; font-weight: 600; }
  .pay { display: grid; grid-template-columns: 1fr auto; gap: 16px; margin-top: 16px; border-top: 1px solid #e3eee6; padding-top: 12px; break-inside: avoid; }
  .bank th { width: 34%; font-weight: 400; padding-left: 0; }
  .bank td { font-weight: 600; }
  .code-row { display: flex; gap: 12px; }
  figure { margin: 0; width: 128px; text-align: center; font-size: 10.5px; color: #445; }
  figure img { width: 128px; height: 128px; object-fit: contain; display: block; }
  footer { margin-top: 18px; font-size: 12px; border-top: 1px solid #e3eee6; padding-top: 8px; text-align: center; }
  #print { position: fixed; right: 16px; bottom: 16px; font: inherit; padding: 10px 18px; border-radius: 6px; border: 0; background: #276b34; color: #fff; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
  @media (max-width: 640px) { .pay, .head, header { display: block; } .issuer { text-align: left; margin-top: 8px; } }
  @media print {
    #print { display: none; }
    body { padding: 0; max-width: none; font-size: 11px; line-height: 1.35; }
    th, td { padding: 3px 6px; }
    .logo { height: 34px; }
    header { padding-bottom: 8px; }
    .head { margin: 10px 0 6px; }
    h1 { font-size: 20px; }
    .client { margin-bottom: 8px; }
    .box { margin: 10px 0 6px; padding: 8px 10px; }
    .pay { margin-top: 10px; padding-top: 8px; }
    figure, figure img { width: 104px; }
    figure img { height: 104px; }
    footer { margin-top: 10px; }
  }
`
