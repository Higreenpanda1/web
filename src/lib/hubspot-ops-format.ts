/**
 * Renewal reminders and the weekly HubSpot report, as plain functions with no
 * I/O so they can be tested. The HubSpot calls and the email are in
 * ./hubspot-ops.ts.
 *
 * Where the dates come from: the team keeps two dates on each client company
 * in HubSpot — "Next renewal date / 下次续费日期" (registered address and
 * accounting, yearly on the licence date) and "Work permit expiry date /
 * 工作许可到期日". A renewal is worked as a deal in the "Renewal ·" stages of
 * the services pipeline, with the renewal date as its close date.
 */

/** "Renewal ·" stages of the services pipeline (portal 247444202). */
export const RENEWAL_STAGES = {
  active: '4398430915',
  annualReportDue: '4398430916',
  due: '4398430917',
  invoiced: '4398430918',
  renewed: '4398430919',
  churned: '4398430920',
} as const

/** A reminder goes out this many days before the date. */
export const REMIND_DAYS_BEFORE = 30
/** A date this far in the past is stale data, not a renewal to chase. */
const STALE_AFTER_DAYS = 30
/** A renewal deal whose close date is this close to the company's date is that renewal. */
const SAME_RENEWAL_DAYS = 60

export type RenewalKind = 'annual' | 'permit'

export type RenewalCompany = {
  id: string
  name: string
  nextRenewalDate: string | null
  workPermitExpiry: string | null
}

export type RenewalDeal = {
  id: string
  name: string
  stage: string
  closeDate: string | null
}

export type RenewalAction =
  | { type: 'move'; kind: RenewalKind; company: RenewalCompany; date: string; deal: RenewalDeal }
  | { type: 'create'; kind: RenewalKind; company: RenewalCompany; date: string }
  | { type: 'task-only'; kind: RenewalKind; company: RenewalCompany; date: string }

const DAY_MS = 86_400_000

/** Whole days from `from` to `to`, both "YYYY-MM-DD". */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / DAY_MS)
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date.slice(0, 10)) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Our own two companies are in HubSpot too, marked "OUR COMPANY". */
export function isOurCompany(name: string): boolean {
  return /OUR COMPANY/i.test(name)
}

/** A permit renewal deal is named "Work & Residence Permit Renewal …". */
export function dealKind(dealName: string): RenewalKind {
  return /work|permit|工作许可/i.test(dealName) ? 'permit' : 'annual'
}

/**
 * What to do today for one company, given its renewal deals. Only dates
 * within the next REMIND_DAYS_BEFORE days count (and up to a month past, in
 * case the server was down on the day). A date is handled once: after this
 * runs, the deal is past "Active Service", so the next run leaves it alone.
 */
export function planRenewals(
  company: RenewalCompany,
  deals: RenewalDeal[],
  today: string,
): RenewalAction[] {
  const actions: RenewalAction[] = []
  const dates: Array<[RenewalKind, string | null]> = [
    ['annual', company.nextRenewalDate],
    ['permit', company.workPermitExpiry],
  ]
  for (const [kind, date] of dates) {
    if (!date) continue
    const left = daysBetween(today, date)
    if (left > REMIND_DAYS_BEFORE || left < -STALE_AFTER_DAYS) continue

    const deal = deals.find(
      (d) =>
        dealKind(d.name) === kind &&
        (!d.closeDate || Math.abs(daysBetween(d.closeDate, date)) <= SAME_RENEWAL_DAYS),
    )
    if (isOurCompany(company.name)) {
      actions.push({ type: 'task-only', kind, company, date })
    } else if (!deal) {
      actions.push({ type: 'create', kind, company, date })
    } else if (deal.stage === RENEWAL_STAGES.active) {
      actions.push({ type: 'move', kind, company, date, deal })
    }
    // Any later stage means someone is already on it.
  }
  return actions
}

/** The company's short name: "广州玛萨商贸有限公司 / Masa" → kept whole; HubSpot names are already bilingual. */
function companyLabel(company: RenewalCompany): string {
  return company.name
    .replace(/\s*\((?:OUR COMPANY|under registration|proposed)[^)]*\)/gi, '')
    .trim()
}

export function renewalTask(kind: RenewalKind, company: RenewalCompany, date: string) {
  const name = companyLabel(company)
  if (kind === 'permit') {
    return {
      subject: `Work permit expires in 30 days / 工作许可30天后到期 – ${name}`,
      body:
        `The work and residence permit expires on ${date}. Contact the client and start the renewal.\n` +
        `工作许可及居留许可将于${date}到期。请联系客户并开始办理续签。`,
    }
  }
  return {
    subject: `Renewal in 30 days / 30天后续费 – ${name}`,
    body:
      `Registered address and accounting renew on ${date}. Contact the client, confirm the services, and send the invoice.\n` +
      `注册地址及代理记账将于${date}续费。请联系客户，确认服务内容，并开具发票。`,
  }
}

export function renewalDealName(kind: RenewalKind, company: RenewalCompany, date: string): string {
  const year = date.slice(0, 4)
  const name = companyLabel(company)
  return kind === 'permit'
    ? `Work & Residence Permit Renewal ${year} / ${year}年工作许可及居留许可续签 – ${name}`
    : `Annual Renewal ${year}: Address + Accounting / ${year}年度续费：注册地址+代理记账 – ${name}`
}

// ─── Weekly report ──────────────────────────────────────────────────────────

/** Stages where a deal is finished, or parked by design, and never "late". */
export const QUIET_STAGES = new Set([
  '4392706770', // Company Ready
  '4392706771', // Not Completed
  '4394109649', // Nasher · Completed
  '4394109650', // Nasher · Lost
  RENEWAL_STAGES.active, // waits a year by design
  RENEWAL_STAGES.renewed,
  RENEWAL_STAGES.churned,
])

/** Stages where an unpaid balance no longer matters. */
const LOST_STAGES = new Set(['4392706771', '4394109650', RENEWAL_STAGES.churned])

/** A deal that has not changed for this long is late. */
export const STALE_DEAL_DAYS = 14
/** Renewals listed in the report. */
export const REPORT_RENEWAL_DAYS = 60

export type ReportDeal = {
  id: string
  name: string
  stage: string
  amount: number | null
  ourCompany: string | null
  service: string | null
  paymentStatus: string | null
  createdAt: string
  updatedAt: string
}

export type ReportTask = { id: string; subject: string; dueAt: string; dealId: string | null }

export type ReportRenewal = { company: RenewalCompany; kind: RenewalKind; date: string }

export type ReportInput = {
  today: string
  deals: ReportDeal[]
  overdueTasks: ReportTask[]
  companies: RenewalCompany[]
  dealUrl: (id: string) => string
  taskUrl: (id: string) => string
}

export type ReportSections = {
  since: string
  newDeals: ReportDeal[]
  lateDeals: Array<{ deal: ReportDeal; reason: string }>
  lateTasks: ReportTask[]
  unpaid: ReportDeal[]
  renewals: ReportRenewal[]
}

export function reportSections(input: ReportInput): ReportSections {
  const since = addDays(input.today, -7)
  const newDeals = input.deals
    .filter((d) => d.createdAt.slice(0, 10) >= since)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const lateDeals = input.deals
    .filter((d) => !QUIET_STAGES.has(d.stage))
    .flatMap((deal) => {
      const idle = daysBetween(deal.updatedAt, input.today)
      return idle >= STALE_DEAL_DAYS ? [{ deal, reason: `ما تحركت من ${idle} يوم` }] : []
    })
  // A late deal is listed once, not again for each of its overdue tasks.
  const lateIds = new Set(lateDeals.map((l) => l.deal.id))
  const lateTasks = input.overdueTasks
    .filter((t) => !t.dealId || !lateIds.has(t.dealId))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))

  const unpaid = input.deals.filter(
    (d) =>
      (d.paymentStatus === 'unpaid' || d.paymentStatus === 'partially_paid') &&
      !LOST_STAGES.has(d.stage),
  )

  const renewals: ReportRenewal[] = []
  for (const company of input.companies) {
    const dates: Array<[RenewalKind, string | null]> = [
      ['annual', company.nextRenewalDate],
      ['permit', company.workPermitExpiry],
    ]
    for (const [kind, date] of dates) {
      if (!date) continue
      const left = daysBetween(input.today, date)
      if (left >= 0 && left <= REPORT_RENEWAL_DAYS) renewals.push({ company, kind, date })
    }
  }
  renewals.sort((a, b) => a.date.localeCompare(b.date))

  return { since, newDeals, lateDeals, lateTasks, unpaid, renewals }
}

const SERVICE_AR: Record<string, string> = {
  company_registration: 'تأسيس شركة',
  hk_company: 'شركة هونغ كونغ',
  registered_address: 'العنوان المسجل',
  accounting: 'المحاسبة',
  licence_changes: 'تعديل الرخصة',
  bank_account: 'حساب بنكي',
  alipay_wechat: 'Alipay و WeChat',
  trademark: 'علامة تجارية',
  work_permit: 'كرت العمل والإقامة',
  business_visa: 'تأشيرة تجارية',
  invitation_letter: 'خطاب دعوة',
  family_visa: 'تأشيرة عائلية',
  store_setup: 'فتح متجر',
  consultation: 'استشارة',
  product_sourcing: 'البحث عن منتج',
  manufacturing: 'التصنيع',
  quality_inspection: 'فحص البضاعة',
  shipping: 'الشحن',
  trade_fair: 'مرافقة في المعارض',
  full_import: 'استيراد كامل',
}

const COMPANY_AR: Record<string, string> = { higp: 'HiGP', nasher: 'ناشر' }

const PAYMENT_AR: Record<string, string> = {
  unpaid: 'ما دفع',
  partially_paid: 'دفع جزء',
}

const KIND_AR: Record<RenewalKind, string> = {
  annual: 'العنوان والمحاسبة',
  permit: 'كرت العمل',
}

function yuan(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} يوان`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function dealLine(deal: ReportDeal): string {
  const bits = [
    deal.ourCompany ? (COMPANY_AR[deal.ourCompany] ?? deal.ourCompany) : null,
    deal.service ? (SERVICE_AR[deal.service] ?? deal.service) : null,
    deal.amount ? yuan(deal.amount) : null,
  ].filter(Boolean)
  return bits.length ? `${deal.name} (${bits.join('، ')})` : deal.name
}

type Item = { text: string; url?: string }

export function reportEmail(input: ReportInput): { subject: string; text: string; html: string } {
  const s = reportSections(input)
  const lateCount = s.lateDeals.length + s.lateTasks.length

  const sections: Array<{ title: string; items: Item[]; note?: string }> = [
    {
      title: `طلبات جديدة (${s.newDeals.length})`,
      items: s.newDeals.map((d) => ({ text: dealLine(d), url: input.dealUrl(d.id) })),
    },
    {
      title: `صفقات متأخرة (${lateCount})`,
      items: [
        ...s.lateDeals.map(({ deal, reason }) => ({
          text: `${deal.name}: ${reason}`,
          url: input.dealUrl(deal.id),
        })),
        ...s.lateTasks.map((t) => ({
          text: `مهمة فات موعدها (${t.dueAt.slice(0, 10)}): ${t.subject}`,
          url: t.dealId ? input.dealUrl(t.dealId) : input.taskUrl(t.id),
        })),
      ],
    },
    {
      title: `ما اكتمل دفعها (${s.unpaid.length})`,
      items: s.unpaid.map((d) => ({
        text: `${d.name}: ${d.amount ? yuan(d.amount) : 'بدون مبلغ'}، ${PAYMENT_AR[d.paymentStatus ?? ''] ?? ''}`,
        url: input.dealUrl(d.id),
      })),
    },
    {
      title: `تجديدات خلال ${REPORT_RENEWAL_DAYS} يوم (${s.renewals.length})`,
      items: s.renewals.map((r) => ({
        text: `${r.company.name}: ${KIND_AR[r.kind]}، ${r.date}`,
      })),
    },
  ]

  const intro = `هلا سامي، هذا ملخص الأسبوع من ${s.since} إلى ${input.today}.`
  const empty = 'ما فيه شي هذا الأسبوع.'

  const text = [
    intro,
    '',
    ...sections.flatMap((section) => [
      section.title,
      ...(section.items.length
        ? section.items.map((i) => `- ${i.text}${i.url ? `\n  ${i.url}` : ''}`)
        : [empty]),
      '',
    ]),
  ].join('\n')

  const html =
    `<!doctype html><html dir="rtl" lang="ar"><body style="font-family:Tahoma,Arial,sans-serif;color:#111;line-height:1.7;max-width:640px;direction:rtl;text-align:right">` +
    `<p>${escapeHtml(intro)}</p>` +
    sections
      .map(
        (section) =>
          `<h3 style="margin:20px 0 6px;color:#1f7a3f">${escapeHtml(section.title)}</h3>` +
          (section.items.length
            ? `<ul style="padding-right:18px;margin:0">${section.items
                .map(
                  (i) =>
                    `<li>${i.url ? `<a href="${escapeHtml(i.url)}">${escapeHtml(i.text)}</a>` : escapeHtml(i.text)}</li>`,
                )
                .join('')}</ul>`
            : `<p style="margin:0;color:#666">${empty}</p>`),
      )
      .join('') +
    `</body></html>`

  return {
    subject: `تقرير الأسبوع من HubSpot: ${s.newDeals.length} طلبات جديدة، ${lateCount} متأخرة، ${s.unpaid.length} ما اكتمل دفعها`,
    text,
    html,
  }
}
