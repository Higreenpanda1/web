import { escapeHtml, type Issuer } from './billing-document'
import type { HistoryRow } from './client-history'
import { OTHER_COUNTRIES, PRIORITY_COUNTRIES } from './countries'

/**
 * The business relationship letter a client gives their bank with a transfer
 * to us: who the client is, since when we have been dealing with them, every
 * request they made through the site, and what this payment is for. Banks in
 * the Gulf often ask for it before they release a payment to China.
 *
 * Served by GET /api/applications/:id/relationship, printed to PDF by the
 * team, signed and stamped. English and Arabic side by side: the reader is
 * the client's bank. Same letterhead and colours as the quote and invoices.
 */

export type RelationshipLetter = {
  issuer: Issuer
  /** What the client pays this issuer for, e.g. "purchase of goods". */
  purpose: { en: string; ar: string }
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

function countryNames(value: string | null | undefined): { en: string; ar: string } | null {
  if (!value) return null
  const found = [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES].find((c) =>
    [c.ar, c.en].includes(value),
  )
  return found ? { en: found.en, ar: found.ar } : { en: value, ar: value }
}

export function renderRelationshipLetter(doc: RelationshipLetter): string {
  const first = doc.history[0]?.date ?? doc.date
  const count = doc.history.length
  const country = countryNames(doc.client.country)
  const wa = `<bdi dir="ltr" class="nowrap">${e(doc.client.whatsapp)}</bdi>`
  const ref = (value: string) => `<bdi class="nowrap">${e(value)}</bdi>`
  const who = {
    en: [doc.client.name, doc.client.company, country?.en]
      .filter(Boolean)
      .map((v) => e(v!))
      .join(', '),
    ar: [doc.client.name, doc.client.company, country?.ar]
      .filter(Boolean)
      .map((v) => `<bdi>${e(v!)}</bdi>`)
      .join('، '),
  }
  const number = `REL-${doc.reference}`

  const english = `
    <p>To whom it may concern,</p>
    <p>This letter confirms that <b>${who.en}</b> (WhatsApp ${wa}) is a client of
    <b>${e(doc.issuer.en)}</b>, a HiGreenPanda group company.</p>
    <p>Our records show the client's first request on <b>${first}</b>, and
    ${count === 1 ? '<b>1</b> request' : `<b>${count}</b> requests`} with us since then, listed below.
    We remain in regular contact with the client.</p>
    <p>A transfer from this client to our account is payment for request
    <b>${ref(doc.current.reference)}</b>${doc.current.amount ? `, valued at <b>${ref(doc.current.amount)}</b>` : ''}:
    ${e(doc.purpose.en)}.</p>`

  const arabic = `
    <p>إلى من يهمه الأمر،</p>
    <p>نشهد بأن <b>${who.ar}</b> (واتساب ${wa}) عميل لدى
    <b><bdi>${e(doc.issuer.en)}</bdi></b>، إحدى شركات مجموعة HiGreenPanda.</p>
    <p>وتُظهر سجلاتنا أن أول طلب من العميل كان بتاريخ <b>${ref(first)}</b>، وأن عدد طلباته لدينا منذ ذلك الحين
    <b>${count}</b>، وهي مبيّنة في الجدول أدناه. ونحن على تواصل مستمر مع العميل.</p>
    <p>وأي تحويل من هذا العميل إلى حسابنا هو دفعة عن الطلب <b>${ref(doc.current.reference)}</b>${
      doc.current.amount ? ` بقيمة <b>${ref(doc.current.amount)}</b>` : ''
    }: ${e(doc.purpose.ar)}.</p>`

  const rows = doc.history
    .map(
      (row) => `<tr${row.reference === doc.current.reference ? ' class="current"' : ''}>
        <td class="nowrap">${row.date}</td>
        <td class="nowrap">${e(row.reference)}</td>
        <td>${e(row.what.en)} <span class="ar">${e(row.what.ar)}</span>${
          row.products.length
            ? `<small>${e(row.products.slice(0, 4).join(', '))}${row.products.length > 4 ? ` +${row.products.length - 4}` : ''}</small>`
            : ''
        }</td>
        <td class="num">${row.amount ? e(row.amount) : '–'}</td>
        <td>${e(row.status.en)} <span class="ar">${e(row.status.ar)}</span></td>
      </tr>`,
    )
    .join('')

  const head = (en: string, ar: string, cls = '') =>
    `<th${cls ? ` class="${cls}"` : ''}>${en} <span class="ar">${ar}</span></th>`

  const verify = {
    en: `For verification, the bank may contact us at contact@higreenpanda.com or on WhatsApp <span dir="ltr" class="nowrap">+86 130 2344 0305</span>.`,
    ar: `وللتحقق يمكن للبنك التواصل معنا عبر <bdi>contact@higreenpanda.com</bdi> أو واتساب <bdi dir="ltr" class="nowrap">+86 130 2344 0305</bdi>.`,
  }

  const printButton = doc.nonce
    ? `<button type="button" id="print">Print / Save as PDF · طباعة</button>
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
    <b>${e(doc.issuer.en)}</b><br>${e(doc.issuer.zh)}
    <small>${e(doc.issuer.addressEn)}<br>${e(doc.issuer.contact)}</small>
  </div>
</header>
<div class="head">
  <h1>Business Relationship Letter</h1>
  <h1 class="ar" dir="rtl">خطاب إثبات تعامل تجاري</h1>
</div>
<table class="meta">
  <tr><th>Letter No. <span class="ar">رقم الخطاب</span></th><td>${e(number)}</td>
      <th>Date <span class="ar">التاريخ</span></th><td>${doc.date}</td></tr>
</table>
<div class="cols">
  <section lang="en">${english}</section>
  <section lang="ar" dir="rtl" class="ar-text">${arabic}</section>
</div>
<table class="lines">
  <thead><tr>
    ${head('Date', 'التاريخ')}${head('Request No.', 'رقم الطلب')}${head('Request', 'الطلب')}${head('Value', 'القيمة', 'num')}${head('Status', 'الحالة')}
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="cols small">
  <p lang="en">${verify.en}</p>
  <p lang="ar" dir="rtl" class="ar-text">${verify.ar}</p>
</div>
<div class="sign">
  <div class="line"></div>
  <p>Authorised signature and company stamp <span class="ar">التوقيع المعتمد وختم الشركة</span><br>
  <b>${e(doc.issuer.en)}</b><br>${e(doc.issuer.zh)}</p>
</div>
</body>
</html>`
}

const STYLE = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", "Noto Sans", "Noto Naskh Arabic", Tahoma, Arial, sans-serif;
    color: #17221a; background: #fff; margin: 0 auto; max-width: 820px; padding: 24px 16px; line-height: 1.55; font-size: 13px; }
  .ar { font-family: "Noto Naskh Arabic", "Geeza Pro", Tahoma, Arial, sans-serif; color: #4a5a4e; }
  .ar-text { font-family: "Noto Naskh Arabic", "Geeza Pro", Tahoma, Arial, sans-serif; font-size: 14px; }
  .nowrap { white-space: nowrap; }
  header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; border-bottom: 3px solid #378d42; padding-bottom: 12px; }
  .logo { height: 42px; width: auto; }
  .issuer { text-align: right; font-size: 12px; }
  .issuer small { display: block; color: #556; margin-top: 4px; }
  .head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin: 18px 0 6px; }
  h1 { font-size: 22px; margin: 0; color: #12341b; }
  h1.ar { color: #276b34; }
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
  .lines thead .ar { color: #cfe9d3; }
  .lines tbody td { border-bottom: 1px solid #e3eee6; }
  .lines .ar { display: block; }
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
