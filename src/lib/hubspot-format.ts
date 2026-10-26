import type { NotificationRow } from './email'

/**
 * What gets written to HubSpot for a website application, as plain functions
 * with no I/O so they can be tested. The sending is in ./hubspot.ts.
 */

export type HubSpotApplication = {
  reference: string
  type: string
  typeLabel: string
  name: string
  country: string
  whatsapp: string
  email: string | null
  headline: string
  /** The stored answers, for the few that decide the deal's service. */
  details: Record<string, unknown>
  /** The page the form was sent from, and where the visitor came from before it. */
  sourcePath: string | null
  referrer: string | null
  rows: NotificationRow[]
}

/** The values of the deal property "Our company / 我方公司". */
export type OurCompany = 'higp' | 'nasher'

/**
 * The values of the deal property "Service / 服务" (hgp_service), with the
 * labels exactly as they are in HubSpot: the deal and task names reuse them,
 * so a deal reads the same wherever the team looks.
 */
export const SERVICES = {
  company_registration: 'Company Registration / 公司注册',
  hk_company: 'Hong Kong Company / 香港公司注册',
  registered_address: 'Registered Address / 注册地址',
  accounting: 'Accounting & Tax / 会计及纳税申报',
  licence_changes: 'Licence Changes / 营业执照变更',
  bank_account: 'Bank Account / 银行开户',
  alipay_wechat: 'Alipay & WeChat Pay / 支付宝和微信支付',
  trademark: 'Trademark / 商标注册',
  work_permit: 'Work & Residence Permit / 工作许可和居留许可',
  business_visa: 'Business Visa / 商务签证',
  invitation_letter: 'Invitation Letter / 商务邀请函',
  family_visa: 'Family Reunion Visa / 家庭团聚签证',
  store_setup: 'Store Setup / 店铺开设',
  consultation: 'Consultation / 咨询',
  product_sourcing: 'Product Sourcing / 产品采购',
  manufacturing: 'Manufacturing / 生产制造',
  quality_inspection: 'Quality Inspection / 质量检验',
  shipping: 'Shipping & Freight / 运输与货运',
  trade_fair: 'Trade Fair Support / 展会陪同',
  full_import: 'Full Import Management / 全程进口管理',
} as const

export type Service = keyof typeof SERVICES

/** Chinese labels for the company-registration questions; others stay in English. */
const ZH_LABELS: Record<string, string> = {
  'Full name of the legal representative': '法定代表人姓名',
  Gender: '性别',
  'Date of birth': '出生日期',
  Nationality: '国籍',
  'Country of residence': '居住国家',
  'Do you have a Chinese phone number?': '是否有中国手机号',
  'Are you in China now?': '目前是否在中国',
  'City of registration': '注册城市',
  'Which city?': '城市',
  'Proposed company names': '拟定公司名称',
  'Scope of business': '经营范围',
  'Registered capital': '注册资本',
  'Currency of the capital': '资本币种',
  'Registered address': '注册地址',
  'Do you want a work permit and residence permit?': '是否需要工作许可和居留许可',
  Ownership: '股权结构',
  Shareholders: '股东',
  'Who makes the major decisions?': '重大事项决策人',
  'Would you also like us to arrange…': '其他需要的服务',
  'Anything else we should know': '备注',
  'Passport photo page': '护照照片页',
  'China entry stamp': '中国入境章',
}

const FOLLOW_UP_DAYS = 7
const REPLY_DAYS = 1
const DAY_MS = 24 * 60 * 60 * 1000

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** "Naif Albusais" → first "Naif", last "Albusais". One word goes in firstname. */
export function splitName(name: string): { firstname: string; lastname: string } {
  const [first = '', ...rest] = name.trim().split(/\s+/)
  return { firstname: first, lastname: rest.join(' ') }
}

export function isCompanyRegistration(app: Pick<HubSpotApplication, 'type'>): boolean {
  return app.type === 'company-registration'
}

/**
 * Which of our companies handles a form, and as which service. Nasher does
 * the trade (products, shipping), HiGP everything else. A consultation can
 * be about anything; the team changes the service once they know.
 */
export function dealCategory(app: Pick<HubSpotApplication, 'type' | 'details'>): {
  company: OurCompany
  service: Service
} {
  const answer = (key: string) =>
    typeof app.details[key] === 'string' ? (app.details[key] as string) : ''
  switch (app.type) {
    case 'company-registration':
      return { company: 'higp', service: 'company_registration' }
    case 'account-opening':
      return {
        company: 'higp',
        service: ['alipay', 'wechat-pay'].includes(answer('accountType'))
          ? 'alipay_wechat'
          : 'bank_account',
      }
    case 'trademark':
      return { company: 'higp', service: 'trademark' }
    case 'visa': {
      const visaType = answer('visaType')
      return {
        company: 'higp',
        service:
          visaType === 'work'
            ? 'work_permit'
            : visaType === 'family'
              ? 'family_visa'
              : 'business_visa',
      }
    }
    case 'visa-invitation':
      return { company: 'higp', service: 'invitation_letter' }
    case 'store-setup':
      return { company: 'higp', service: 'store_setup' }
    case 'product-search':
      return { company: 'nasher', service: 'product_sourcing' }
    case 'shipping-quote':
      return { company: 'nasher', service: 'shipping' }
    default:
      return { company: 'higp', service: 'consultation' }
  }
}

/** "Bank Account / 银行开户" → English and Chinese halves. */
function serviceLabel(service: Service): { en: string; zh: string } {
  const [en = '', zh = ''] = SERVICES[service].split(' / ')
  return { en, zh }
}

export function dealName(app: HubSpotApplication): string {
  // Company formation keeps the name the team already uses for its deals.
  if (isCompanyRegistration(app)) {
    return `Company Formation / 公司注册 – ${app.name} – ${app.reference}`
  }
  return `${SERVICES[dealCategory(app).service]} – ${app.name} – ${app.reference}`
}

/**
 * HiGP services have a fixed price and start after payment, so they get the
 * week-later payment check. Nasher's are priced only once a factory is found,
 * and a consultation is not yet a service, so those get only the reply task.
 */
export function needsPaymentCheck(app: Pick<HubSpotApplication, 'type' | 'details'>): boolean {
  const { company, service } = dealCategory(app)
  return company === 'higp' && service !== 'consultation'
}

/**
 * "Request source / 来源": the page the form was sent from, and the site the
 * visitor came from when it was not ours ("/apply/visa (from google.com)").
 */
export function requestSource(sourcePath: string | null, referrer: string | null): string {
  const page = sourcePath || 'website'
  let host = ''
  try {
    host = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''
  } catch {
    host = ''
  }
  const ours = host === 'higreenpanda.com' || host.endsWith('.higreenpanda.com')
  return host && !ours ? `${page} (from ${host})` : page
}

/** Everything the deal carries besides its stage and owner. */
export function dealProperties(app: HubSpotApplication): Record<string, string> {
  const { company, service } = dealCategory(app)
  return {
    dealname: dealName(app),
    our_company: company,
    hgp_service: service,
    hgp_request_source: requestSource(app.sourcePath, app.referrer),
  }
}

/** The note: every answer, labels in English with Chinese where we have it. */
export function noteBody(app: HubSpotApplication): string {
  const head = `<p><b>${escapeHtml(app.typeLabel)} / 网站申请</b> – ${escapeHtml(app.reference)}</p>`
  const contact: Array<[string, string]> = [
    ['Name / 姓名', app.name],
    ['Country / 国家', app.country],
    ['WhatsApp', app.whatsapp],
    ['Email / 邮箱', app.email ?? '—'],
  ]
  const answers = app.rows.map(({ label, value }): [string, string] => {
    const zh = ZH_LABELS[label]
    return [zh ? `${label} / ${zh}` : label, value]
  })
  const list = (items: Array<[string, string]>) =>
    `<ul>${items.map(([k, v]) => `<li><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</li>`).join('')}</ul>`
  const status = needsPaymentCheck(app)
    ? '<p><b>Status / 状态:</b> Not paid yet – work starts after payment / 尚未付款 – 付款后开始办理</p>'
    : ''
  return `${head}${list(contact)}<p><b>Answers / 申请内容</b></p>${list(answers)}${status}`
}

/** Every request: someone writes to the client within a day. */
export function replyTask(app: HubSpotApplication, now = new Date()) {
  const { en, zh } = serviceLabel(dealCategory(app).service)
  return {
    subject: `Reply to client: ${app.name} – ${en} / 回复客户：${app.name} – ${zh}`,
    body:
      `New website request ${app.reference}. Message the client on WhatsApp ${app.whatsapp} ` +
      `within one day and confirm what they need. / ` +
      `网站新请求 ${app.reference}。请在一天内通过WhatsApp ${app.whatsapp}联系客户，确认需求。`,
    dueISO: new Date(now.getTime() + REPLY_DAYS * DAY_MS).toISOString(),
  }
}

export function followUpTask(app: HubSpotApplication, now = new Date()) {
  const due = new Date(now.getTime() + FOLLOW_UP_DAYS * DAY_MS)
  return {
    subject: `Payment check: ${app.name} / 付款确认：${app.name}`,
    body:
      `Has the client paid? Paid → move the deal to "Deposit Paid" and start. ` +
      `Not paid → send a polite message (request received, it will expire soon, ` +
      `we can arrange an appointment) without mentioning payment, then move the deal to "Not Completed". / ` +
      `客户是否已付款？已付款 → 将交易移至"已付定金"并开始办理。` +
      `未付款 → 礼貌地告知客户申请已收到、即将过期，可以预约沟通（不要提付款），然后将交易移至"未完成"。`,
    dueISO: due.toISOString(),
  }
}
