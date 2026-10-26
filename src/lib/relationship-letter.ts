import { escapeHtml, type Issuer } from './billing-document'
import type { HistoryRow } from './client-history'
import { countryName, OTHER_COUNTRIES, PRIORITY_COUNTRIES } from './countries'

/**
 * The business relationship letter a client gives their bank with a transfer
 * to us: who the client is, since when we have been dealing with them, every
 * request they made through the site, and what this payment is for. Banks in
 * the Gulf often ask for it before they release a payment to China.
 *
 * Served by GET /api/applications/:id/relationship, printed to PDF by the
 * team, signed and stamped. English and Chinese side by side, like the quote
 * and invoices: the owner chose those two on 26 Oct 2026. Same letterhead
 * and colours as the quote and invoices.
 */

export type RelationshipLetter = {
  issuer: Issuer
  /** What the client pays this issuer for, e.g. "purchase of goods". */
  purpose: { en: string; zh: string }
  reference: string
  /** YYYY-MM-DD, the day it is printed. */
  date: string
  client: {
    name: string
    company?: string | null
    country?: string | null
    whatsapp: string
  }
  /** Oldest first; includes the request this payment is for. */
  history: HistoryRow[]
  /** The request this payment is for, and its value when priced. */
  current: { reference: string; amount: string | null }
  nonce: string | null
}

const e = escapeHtml

function countryNames(value: string | null | undefined): { en: string; zh: string } | null {
  if (!value) return null
  const found = [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES].find((c) =>
    [c.ar, c.en].includes(value),
  )
  return found ? { en: found.en, zh: countryName(found, 'zh') } : { en: value, zh: value }
}

export function renderRelationshipLetter(doc: RelationshipLetter): string {
  const first = doc.history[0]?.date ?? doc.date
  const count = doc.history.length
  const country = countryNames(doc.client.country)
  const wa = `<span class="nowrap">${e(doc.client.whatsapp)}</span>`
  const ref = (value: string) => `<span class="nowrap">${e(value)}</span>`
  const who = {
    en: [doc.client.name, doc.client.company, country?.en]
      .filter(Boolean)
      .map((v) => e(v!))
      .join(', '),
    zh: [doc.client.name, doc.client.company, country?.zh]
      .filter(Boolean)
      .map((v) => e(v!))
      .join('，'),
  }
  const number = `REL-${doc.reference}`

  const english = `
    <p>To whom it may concern,</p>
    <p>This letter confirms that <b>${who.en}</b> (WhatsApp ${wa}) is a client of
    <b>${e(doc.issuer.en)}</b>, a HiGreenPanda group company.</p>
    <p>Our records show the client's first request on <b>${ref(first)}</b>, and
    ${count === 1 ? '<b>1</b> request' : `<b>${count}</b> requests`} with us since then, listed below.
    We remain in regular contact with the client.</p>
    <p>A transfer from this client to our account is payment for request
    <b>${ref(doc.current.reference)}</b>${doc.current.amount ? `, valued at <b>${ref(doc.current.amount)}</b>` : ''}:
    ${e(doc.purpose.en)}.</p>`

  const chinese = `
    <p>致相关负责人：</p>
    <p>兹证明 <b>${who.zh}</b>（WhatsApp ${wa}）为 <b>${e(doc.issuer.zh)}</b>（HiGreenPanda 集团旗下公司）的客户。</p>
    <p>根据我方记录，该客户首次向我方提出需求的日期为 <b>${ref(first)}</b>，此后共向我方提交 <b>${count}</b> 项需求，详见下表。我方与该客户保持持续联系。</p>
    <p>该客户向我方账户的转账为需求 <b>${ref(doc.current.reference)}</b>${
      doc.current.amount ? `（金额 <b>${ref(doc.current.amount)}</b>）` : ''
    }的付款：${e(doc.purpose.zh)}。</p>`

  const rows = doc.history
    .map(
      (row) => `<tr${row.reference === doc.current.reference ? ' class="current"' : ''}>
        <td class="nowrap">${row.date}</td>
        <td class="nowrap">${e(row.reference)}</td>
        <td>${e(row.what.en)} <span class="zh">${e(row.what.zh)}</span>${
          row.products.length
            ? `<small>${e(row.products.slice(0, 4).join(', '))}${row.products.length > 4 ? ` +${row.products.length - 4}` : ''}</small>`
            : ''
        }</td>
        <td class="num">${row.amount ? e(row.amount) : '–'}</td>
        <td>${e(row.status.en)} <span class="zh">${e(row.status.zh)}</span></td>
      </tr>`,
    )
    .join('')

  const head = (en: string, zh: string, cls = '') =>
    `<th${cls ? ` class="${cls}"` : ''}>${en} <span class="zh">${zh}</span></th>`

  const phone = '<span class="nowrap">+86 130 2344 0305</span>'
  const verify = {
    en: `For verification, the bank may contact us at contact@higreenpanda.com or on WhatsApp ${phone}.`,
    zh: `如需核实，银行可通过 contact@higreenpanda.com 或 WhatsApp ${phone} 与我方联系。`,
  }

  const printButton = doc.nonce
    ? `<button type="button" id="print">打印 / 保存为 PDF · Print / Save as PDF</button>
       <script nonce="${e(doc.nonce)}">document.getElementById('print').addEventListener('click',()=>window.print())</script>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${e(number)} · Business relationship letter</title>
<style>${STYLE}</style>
</head>
<body>
${printButton}
<header>
  <img src="/brand/web/logo-wordmark@2x.png" alt="HiGreenPanda" class="logo">
  <div class="issuer">
    <b>${e(doc.issuer.zh)}</b><br>${e(doc.issuer.en)}
    <small>${e(doc.issuer.addressZh)}<br>${e(doc.issuer.addressEn)}<br>${e(doc.issuer.contact)}</small>
  </div>
</header>
<div class="head">
  <h1>Business Relationship Letter</h1>
  <h1 class="zh" lang="zh-CN">业务往来证明函</h1>
</div>
<table class="meta">
  <tr><th>Letter No. <span class="zh">函号</span></th><td>${e(number)}</td>
      <th>Date <span class="zh">日期</span></th><td>${doc.date}</td></tr>
</table>
<div class="cols">
  <section lang="en">${english}</section>
  <section lang="zh-CN" class="zh-text">${chinese}</section>
</div>
<table class="lines">
  <thead><tr>
    ${head('Date', '日期')}${head('Request No.', '需求编号')}${head('Request', '需求内容')}${head('Value', '金额', 'num')}${head('Status', '状态')}
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="cols small">
  <p lang="en">${verify.en}</p>
  <p lang="zh-CN" class="zh-text">${verify.zh}</p>
</div>
<div class="sign">
  <div class="line"></div>
  <p>Authorised signature and company stamp <span class="zh">授权签字及公司盖章</span><br>
  <b>${e(doc.issuer.zh)}</b><br>${e(doc.issuer.en)}</p>
</div>
</body>
</html>`
}

const STYLE = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", Arial, sans-serif;
    color: #17221a; background: #fff; margin: 0 auto; max-width: 820px; padding: 24px 16px; line-height: 1.55; font-size: 13px; }
  .zh { font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif; color: #4a5a4e; }
  .zh-text { font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif; }
  .nowrap { white-space: nowrap; }
  header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; border-bottom: 3px solid #378d42; padding-bottom: 12px; }
  .logo { height: 42px; width: auto; }
  .issuer { text-align: right; font-size: 12px; }
  .issuer small { display: block; color: #556; margin-top: 4px; }
  .head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin: 18px 0 6px; }
  h1 { font-size: 22px; margin: 0; color: #12341b; }
  h1.zh { color: #276b34; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 5px 8px; }
  .meta { width: auto; margin-bottom: 8px; }
  .meta th { font-weight: 400; padding-left: 0; }
  .meta td { font-weight: 600; white-space: nowrap; padding-right: 24px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .cols p { margin: 0 0 8px; }
  .cols.small { font-size: 12px; color: #445; margin-top: 12px; }
  .lines { margin-top: 10px; }
  .lines thead th { background: #12341b; color: #fff; font-weight: 600; }
  .lines thead .zh { color: #cfe9d3; }
  .lines tbody td { border-bottom: 1px solid #e3eee6; }
  .lines .zh { display: block; }
  .lines small { display: block; color: #667; }
  .lines tr.current td { background: #f3f7f4; font-weight: 600; }
  .num { text-align: right; white-space: nowrap; }
  .sign { margin-top: 36px; width: 60%; break-inside: avoid; }
  .sign .line { border-bottom: 1px solid #17221a; height: 64px; }
  .sign p { margin: 6px 0 0; font-size: 12px; }
  #print { position: fixed; right: 16px; bottom: 16px; font: inherit; padding: 10px 18px; border-radius: 6px; border: 0; background: #276b34; color: #fff; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
  @media (max-width: 640px) { .cols, .head, header { display: block; } .issuer { text-align: left; margin-top: 8px; } .sign { width: 100%; } }
  @media print {
    #print { display: none; }
    body { padding: 0; max-width: none; font-size: 11.5px; }
    th, td { padding: 3px 6px; }
  }
`
