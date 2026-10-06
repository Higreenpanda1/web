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
  rows: NotificationRow[]
}

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

export function dealName(app: HubSpotApplication): string {
  return `Company Formation / 公司注册 – ${app.name} – ${app.reference}`
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
  const status = isCompanyRegistration(app)
    ? '<p><b>Status / 状态:</b> Not paid yet – work starts after payment / 尚未付款 – 付款后开始办理</p>'
    : ''
  return `${head}${list(contact)}<p><b>Answers / 申请内容</b></p>${list(answers)}${status}`
}

export function followUpTask(app: HubSpotApplication, now = new Date()) {
  const due = new Date(now.getTime() + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000)
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
