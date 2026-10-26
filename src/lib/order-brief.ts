import en from '@/messages/en.json'
import zh from '@/messages/zh.json'

import { PRIORITY_COUNTRIES, OTHER_COUNTRIES, countryName } from './countries'
import { lineTotal, orderProducts, orderTotal, type OrderItem } from './product-order'

import type { Application } from '@/payload-types'

/**
 * The printable brief of a product request, opened from the request in the
 * admin (the "Print brief" buttons) and served by
 * GET /api/applications/:id/brief.
 *
 *   - `team`: everything — the client, their target prices, the links they
 *     sent, the team's notes and final prices. For the office.
 *   - `factory`: only what a factory needs to quote — the products, photos,
 *     quantities, sizes, colours, details, destination and timing. No client
 *     name or number, no target price, no reference links (they often point
 *     at another supplier), no prices of ours. Safe to send as it is.
 *
 * English and Chinese side by side: the factories read Chinese, the team
 * reads both. Field labels come from the form's own translations, so the
 * brief says "Sizes / 尺码" exactly where the client read "Sizes".
 */

export type BriefAudience = 'team' | 'factory'

type Catalogue = typeof en.apply

const EN = en.apply as Catalogue
const ZH = zh.apply as Catalogue

/** Labels the form does not have. */
const LABELS = {
  title: ['Product request', '产品需求'],
  factoryTitle: ['Product enquiry', '产品询价'],
  reference: ['Reference', '编号'],
  date: ['Date', '日期'],
  client: ['Client', '客户'],
  name: ['Name', '姓名'],
  whatsapp: ['WhatsApp', 'WhatsApp'],
  email: ['Email', '邮箱'],
  country: ['Country', '国家'],
  delivery: ['Delivery', '交货'],
  photos: ['Photos', '图片'],
  noPhotos: ['No photos sent', '客户未提供图片'],
  internalNotes: ['Team notes', '内部备注'],
  prices: ['Final prices', '最终价格'],
  description: ['Description', '描述'],
  unitPrice: ['Unit price', '单价'],
  amount: ['Amount', '金额'],
  total: ['Total', '合计'],
  notPriced: ['Not priced yet', '尚未报价'],
  factoryAsk: [
    'Please quote your best unit price, minimum order quantity and production time for each product.',
    '请就每个产品报出最优单价、最小起订量和生产周期。',
  ],
  print: ['Print', '打印'],
} as const satisfies Record<string, readonly [string, string]>

const NASHER = {
  en: 'Nasher Electronic Commerce (Shanghai) Co., Ltd.',
  zh: '那社尔电子商贸（上海）有限公司',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const both = ([english, chinese]: readonly [string, string]) =>
  english === chinese ? escapeHtml(english) : `${escapeHtml(english)} / ${escapeHtml(chinese)}`

function field(name: string): string {
  const fields = EN.fields as Record<string, string>
  const zhFields = ZH.fields as Record<string, string>
  return both([fields[name] ?? name, zhFields[name] ?? fields[name] ?? name])
}

function option(fieldName: string, code: string | null | undefined): string {
  if (!code) return ''
  const enOptions = (EN.options as Record<string, Record<string, string>>)[fieldName] ?? {}
  const zhOptions = (ZH.options as Record<string, Record<string, string>>)[fieldName] ?? {}
  return both([enOptions[code] ?? code, zhOptions[code] ?? enOptions[code] ?? code])
}

/** The country as the client chose it (in their language), in English and Chinese. */
function country(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  const found = [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES].find((c) =>
    [c.ar, c.en, countryName(c, 'zh')].includes(value),
  )
  return found ? both([found.en, countryName(found, 'zh')]) : escapeHtml(value)
}

function money(amount: number, currency: string): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency.toUpperCase()}`
}

const multiline = (value: string) => escapeHtml(value).replace(/\n/g, '<br>')

function rows(items: Array<[string, string]>): string {
  return items
    .filter(([, value]) => value !== '')
    .map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`)
    .join('')
}

export function renderBrief(
  application: Application,
  audience: BriefAudience,
  { photoUrl, nonce }: { photoUrl: (file: string) => string; nonce: string | null },
): string {
  const details = (application.details ?? {}) as Record<string, unknown>
  const products = orderProducts(details, application.reference)
  const team = audience === 'team'
  const str = (key: string) => (typeof details[key] === 'string' ? (details[key] as string) : '')
  const date = (application.meta?.submittedAt ?? application.createdAt).slice(0, 10)

  const header = `
    <header>
      <img src="/brand/web/logo-wordmark@2x.png" alt="HiGreenPanda" class="logo">
      <div>
        <h1>${both(team ? LABELS.title : LABELS.factoryTitle)}</h1>
        <p class="meta">${both(LABELS.reference)}: <b>${escapeHtml(application.reference)}</b>
        · ${both(LABELS.date)}: ${escapeHtml(date)}</p>
      </div>
    </header>`

  const client = team
    ? `<section><h2>${both(LABELS.client)}</h2><table>${rows([
        [both(LABELS.name), escapeHtml(application.name)],
        [both(LABELS.whatsapp), `<span dir="ltr">${escapeHtml(application.whatsapp)}</span>`],
        [both(LABELS.email), escapeHtml(application.email ?? '')],
        [both(LABELS.country), country(application.country)],
        [field('companyName'), escapeHtml(str('companyName'))],
        [field('companyAddress'), escapeHtml(str('companyAddress'))],
      ])}</table></section>`
    : ''

  const productBlocks = products
    .map((product) => {
      const photos = product.photos.length
        ? `<div class="photos">${product.photos
            .map((file) => `<img src="${escapeHtml(photoUrl(file))}" alt="">`)
            .join('')}</div>`
        : `<p class="muted">${both(LABELS.noPhotos)}</p>`
      const target =
        team && product.targetPrice !== null
          ? money(product.targetPrice, product.priceCurrency ?? 'usd')
          : ''
      const link =
        team && product.productLink
          ? `<a href="${escapeHtml(product.productLink)}">${escapeHtml(product.productLink)}</a>`
          : ''
      const itemLabel = (EN.repeat.products.item as string).replace('{n}', String(product.position))
      const itemLabelZh = (ZH.repeat.products.item as string).replace(
        '{n}',
        String(product.position),
      )
      return `
        <section class="product">
          <h2>${both([itemLabel, itemLabelZh])}: ${escapeHtml(product.productName)}</h2>
          ${photos}
          <table>${rows([
            [
              field('quantity'),
              product.quantity !== null
                ? `<b>${product.quantity.toLocaleString('en-US')}</b> ${option('unit', product.unit)}`
                : '',
            ],
            [field('sizes'), multiline(product.sizes ?? '')],
            [field('colours'), multiline(product.colours ?? '')],
            [field('specs'), multiline(product.specs ?? '')],
            [field('targetPrice'), target],
            [field('productLink'), link],
          ])}</table>
        </section>`
    })
    .join('')

  const delivery = `<section><h2>${both(LABELS.delivery)}</h2><table>${rows([
    [field('destinationCountry'), country(details.destinationCountry)],
    [field('timeline'), option('timeline', str('timeline'))],
    ...(team ? ([[field('notes'), multiline(str('notes'))]] as Array<[string, string]>) : []),
    ...(team
      ? ([[both(LABELS.internalNotes), multiline(application.internalNotes ?? '')]] as Array<
          [string, string]
        >)
      : []),
  ])}</table></section>`

  const prices = team ? pricesTable(application) : ''
  const ask = team ? '' : `<p class="ask">${both(LABELS.factoryAsk)}</p>`

  const printButton = nonce
    ? `<button type="button" id="print">${both(LABELS.print)}</button>
       <script nonce="${escapeHtml(nonce)}">document.getElementById('print').addEventListener('click',()=>window.print())</script>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(application.reference)} · ${both(team ? LABELS.title : LABELS.factoryTitle)}</title>
<style>${STYLE}</style>
</head>
<body>
${printButton}
${header}
${ask}
${client}
${productBlocks}
${delivery}
${prices}
<footer>${escapeHtml(NASHER.en)} · ${escapeHtml(NASHER.zh)} · higreenpanda.com</footer>
</body>
</html>`
}

function pricesTable(application: Application): string {
  const items = (application.order?.items ?? []) as OrderItem[]
  if (items.length === 0) return ''
  const currency = application.order?.currency ?? 'usd'
  const total = orderTotal(items)
  const body = items
    .map((item) => {
      const amount = lineTotal(item)
      return `<tr>
        <td>${escapeHtml(item.productName)}${item.description ? `<br><small>${multiline(item.description)}</small>` : ''}</td>
        <td class="num">${item.quantity != null ? item.quantity.toLocaleString('en-US') : ''} ${option('unit', item.unit)}</td>
        <td class="num">${item.unitPrice != null ? money(item.unitPrice, currency) : `<span class="muted">${both(LABELS.notPriced)}</span>`}</td>
        <td class="num">${amount !== null ? money(amount, currency) : ''}</td>
      </tr>`
    })
    .join('')
  return `<section><h2>${both(LABELS.prices)}</h2>
    <table class="prices">
      <thead><tr><th>${field('productName')}</th><th>${field('quantity')}</th><th>${both(LABELS.unitPrice)}</th><th>${both(LABELS.amount)}</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><th colspan="3">${both(LABELS.total)}</th><td class="num"><b>${total !== null ? money(total, currency) : both(LABELS.notPriced)}</b></td></tr></tfoot>
    </table></section>`
}

const STYLE = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
    color: #17221a; background: #fff; margin: 0 auto; max-width: 820px; padding: 24px 16px; line-height: 1.45; font-size: 14px; }
  header { display: flex; gap: 16px; align-items: center; border-bottom: 3px solid #378d42; padding-bottom: 12px; margin-bottom: 16px; }
  .logo { height: 44px; width: auto; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 16px; margin: 0 0 8px; color: #276b34; }
  .meta { margin: 4px 0 0; color: #445; }
  section { margin: 0 0 18px; break-inside: avoid; page-break-inside: avoid; }
  .product { border: 1px solid #c9e8cd; border-radius: 8px; padding: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 5px 8px; border-bottom: 1px solid #e3eee6; }
  th { width: 34%; font-weight: 600; color: #345; }
  .prices th { width: auto; }
  .num { text-align: right; white-space: nowrap; }
  .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .photos img { height: 160px; max-width: 100%; object-fit: contain; border: 1px solid #e3eee6; border-radius: 6px; background: #f7faf8; }
  .muted { color: #778; }
  .ask { background: #e2f3e5; border-radius: 8px; padding: 10px 12px; }
  a { color: #276b34; word-break: break-all; }
  footer { margin-top: 24px; font-size: 12px; color: #667; border-top: 1px solid #e3eee6; padding-top: 8px; }
  #print { float: right; font: inherit; padding: 8px 16px; border-radius: 6px; border: 0; background: #276b34; color: #fff; cursor: pointer; }
  @media print { #print { display: none; } body { padding: 0; max-width: none; } }
`
