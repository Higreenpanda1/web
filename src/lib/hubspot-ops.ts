import { email as emailConfig, hubspot as hubspotConfig } from './env'
import { ASSOC, assoc, call, owner } from './hubspot'
import {
  RENEWAL_STAGES,
  addDays,
  planRenewals,
  renewalDealName,
  renewalTask,
  reportEmail,
  type RenewalCompany,
  type RenewalDeal,
  type ReportDeal,
  type ReportInput,
  type ReportTask,
} from './hubspot-ops-format'
import { getPayloadClient } from './payload'

/**
 * Two server-side jobs on top of the HubSpot free CRM, run by the scheduler
 * (src/lib/automation/scheduler.ts) and by hand with
 * `npm run automation -- hubspot-renewals|hubspot-report [--dry-run]`:
 *
 *   - renewal reminders, daily: thirty days before a company's renewal or
 *     work-permit date, its renewal deal moves to "Renewal · Renewal Due"
 *     (or one is opened there) and the owner gets a task with a reminder;
 *   - the weekly report, Mondays: an Arabic email to the owner with the
 *     week's new deals, late deals, unpaid deals and coming renewals.
 *
 * Needs HUBSPOT_TOKEN with crm.objects.companies.read on top of the form
 * sync's scopes. Like the form sync, a failure only logs.
 */

type SearchPage<P> = {
  results: Array<{ id: string; properties: P }>
  paging?: { next?: { after: string } }
}

type Filter = {
  propertyName: string
  operator: string
  value?: string
  values?: string[]
  highValue?: string
}

async function searchAll<P>(
  object: string,
  filterGroups: Array<{ filters: Filter[] }>,
  properties: string[],
): Promise<Array<{ id: string; properties: P }>> {
  const all: Array<{ id: string; properties: P }> = []
  let after: string | undefined
  // The search API caps at 10,000 results; this portal has dozens.
  for (let page = 0; page < 50; page++) {
    const result = await call<SearchPage<P>>('POST', `/crm/v3/objects/${object}/search`, {
      filterGroups,
      properties,
      limit: 100,
      ...(after ? { after } : {}),
    })
    all.push(...result.results)
    after = result.paging?.next?.after
    if (!after) break
  }
  return all
}

/** Today's date in China, "YYYY-MM-DD". */
export function chinaToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(now)
}

/** 09:00 China time on a date, as an ISO timestamp. */
function nineAmChina(date: string): string {
  return new Date(`${date}T09:00:00+08:00`).toISOString()
}

const epoch = (date: string) => String(Date.parse(date))

type CompanyProps = {
  name: string | null
  next_renewal_date: string | null
  work_permit_expiry_date: string | null
}

async function companiesWithDates(from: string, to: string): Promise<RenewalCompany[]> {
  const between = (propertyName: string) => ({
    filters: [{ propertyName, operator: 'BETWEEN', value: epoch(from), highValue: epoch(to) }],
  })
  const rows = await searchAll<CompanyProps>(
    'companies',
    [between('next_renewal_date'), between('work_permit_expiry_date')],
    ['name', 'next_renewal_date', 'work_permit_expiry_date'],
  )
  return rows.map(({ id, properties: p }) => ({
    id,
    name: p.name ?? `Company ${id}`,
    nextRenewalDate: p.next_renewal_date?.slice(0, 10) || null,
    workPermitExpiry: p.work_permit_expiry_date?.slice(0, 10) || null,
  }))
}

type DealProps = { dealname: string | null; dealstage: string | null; closedate: string | null }

async function renewalDealsOf(companyId: string): Promise<RenewalDeal[]> {
  const rows = await searchAll<DealProps>(
    'deals',
    [
      {
        filters: [
          { propertyName: 'associations.company', operator: 'EQ', value: companyId },
          { propertyName: 'dealstage', operator: 'IN', values: Object.values(RENEWAL_STAGES) },
        ],
      },
    ],
    ['dealname', 'dealstage', 'closedate'],
  )
  return rows.map(({ id, properties: p }) => ({
    id,
    name: p.dealname ?? '',
    stage: p.dealstage ?? '',
    closeDate: p.closedate?.slice(0, 10) || null,
  }))
}

async function contactsOf(companyId: string): Promise<string[]> {
  const result = await call<{ results: Array<{ toObjectId: number | string }> }>(
    'GET',
    `/crm/v4/objects/companies/${companyId}/associations/contacts?limit=20`,
  )
  return result.results.map((r) => String(r.toObjectId))
}

/** True when this company already has a task with this subject from the last two months. */
async function hasRecentTask(companyId: string, subject: string, today: string): Promise<boolean> {
  const rows = await searchAll<{ hs_task_subject: string | null }>(
    'tasks',
    [
      {
        filters: [
          { propertyName: 'associations.company', operator: 'EQ', value: companyId },
          { propertyName: 'hs_createdate', operator: 'GTE', value: epoch(addDays(today, -60)) },
        ],
      },
    ],
    ['hs_task_subject'],
  )
  return rows.some((r) => r.properties.hs_task_subject === subject)
}

async function createTask(
  subject: string,
  body: string,
  due: string,
  companyId: string,
  dealId: string | null,
): Promise<void> {
  const dueISO = nineAmChina(due)
  await call('POST', '/crm/v3/objects/tasks', {
    properties: {
      hs_task_subject: subject,
      hs_task_body: body,
      hs_timestamp: dueISO,
      hs_task_reminders: String(Date.parse(dueISO)),
      hs_task_status: 'NOT_STARTED',
      hs_task_priority: 'HIGH',
      ...owner(),
    },
    associations: [
      assoc(companyId, ASSOC.taskToCompany),
      ...(dealId ? [assoc(dealId, ASSOC.taskToDeal)] : []),
    ],
  })
}

export type RenewalRun = { done: string[]; failed: string[] }

export async function runRenewalReminders(
  options: { dryRun?: boolean; today?: string } = {},
): Promise<RenewalRun> {
  const run: RenewalRun = { done: [], failed: [] }
  if (!hubspotConfig.configured) {
    console.log('[hubspot] no HUBSPOT_TOKEN; renewal reminders skipped')
    return run
  }
  const today = options.today ?? chinaToday()
  const companies = await companiesWithDates(addDays(today, -31), addDays(today, 31))

  for (const company of companies) {
    let actions
    try {
      actions = planRenewals(company, await renewalDealsOf(company.id), today)
    } catch (error) {
      run.failed.push(`${company.name}: ${(error as Error).message}`)
      continue
    }
    for (const action of actions) {
      const task = renewalTask(action.kind, company, action.date)
      const label = `${action.type} ${action.kind} ${company.name} (${action.date})`
      if (options.dryRun) {
        run.done.push(label)
        continue
      }
      try {
        let dealId: string | null = null
        if (action.type === 'move') {
          dealId = action.deal.id
          await call('PATCH', `/crm/v3/objects/deals/${dealId}`, {
            properties: { dealstage: RENEWAL_STAGES.due },
          })
        } else if (action.type === 'create') {
          const contacts = await contactsOf(company.id).catch(() => [])
          const deal = await call<{ id: string }>('POST', '/crm/v3/objects/deals', {
            properties: {
              dealname: renewalDealName(action.kind, company, action.date),
              pipeline: hubspotConfig.pipelineId,
              dealstage: RENEWAL_STAGES.due,
              closedate: nineAmChina(action.date),
              our_company: 'higp',
              hgp_service: action.kind === 'permit' ? 'work_permit' : 'registered_address',
              deal_currency_code: 'CNY',
              ...owner(),
            },
            associations: [
              assoc(company.id, ASSOC.dealToCompany),
              ...contacts.map((id) => assoc(id, ASSOC.dealToContact)),
            ],
          })
          dealId = deal.id
        } else if (await hasRecentTask(company.id, task.subject, today)) {
          continue
        }
        await createTask(task.subject, task.body, today, company.id, dealId)
        run.done.push(label)
      } catch (error) {
        run.failed.push(`${label}: ${(error as Error).message}`)
      }
    }
  }
  for (const line of run.failed) console.error(`[hubspot] renewal reminder failed: ${line}`)
  return run
}

// ─── Weekly report ──────────────────────────────────────────────────────────

type ReportDealProps = {
  dealname: string | null
  dealstage: string | null
  amount: string | null
  our_company: string | null
  hgp_service: string | null
  payment_status: string | null
  createdate: string
  hs_lastmodifieddate: string
}

async function collectReport(today: string): Promise<ReportInput> {
  const deals = await searchAll<ReportDealProps>(
    'deals',
    [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: hubspotConfig.pipelineId }] }],
    [
      'dealname',
      'dealstage',
      'amount',
      'our_company',
      'hgp_service',
      'payment_status',
      'createdate',
      'hs_lastmodifieddate',
    ],
  )

  let overdueTasks: ReportTask[] = []
  try {
    const tasks = await searchAll<{ hs_task_subject: string | null; hs_timestamp: string }>(
      'tasks',
      [
        {
          filters: [
            { propertyName: 'hs_task_status', operator: 'NEQ', value: 'COMPLETED' },
            { propertyName: 'hs_timestamp', operator: 'LT', value: String(Date.now()) },
          ],
        },
      ],
      ['hs_task_subject', 'hs_timestamp'],
    )
    const links = tasks.length
      ? await call<{
          results: Array<{ from: { id: string }; to: Array<{ toObjectId: number | string }> }>
        }>('POST', '/crm/v4/associations/tasks/deals/batch/read', {
          inputs: tasks.map((t) => ({ id: t.id })),
        })
      : { results: [] }
    const dealOf = new Map(links.results.map((r) => [r.from.id, String(r.to[0]?.toObjectId ?? '')]))
    overdueTasks = tasks.map((t) => ({
      id: t.id,
      subject: t.properties.hs_task_subject ?? '',
      dueAt: t.properties.hs_timestamp,
      dealId: dealOf.get(t.id) || null,
    }))
  } catch (error) {
    // The report is still useful without the task list.
    console.error(`[hubspot] report: overdue tasks unavailable: ${(error as Error).message}`)
  }

  const companies = await companiesWithDates(today, addDays(today, 61))
  const base = `https://app.hubspot.com`
  return {
    today,
    deals: deals.map(
      ({ id, properties: p }): ReportDeal => ({
        id,
        name: p.dealname ?? `Deal ${id}`,
        stage: p.dealstage ?? '',
        amount: p.amount ? Number(p.amount) : null,
        ourCompany: p.our_company || null,
        service: p.hgp_service || null,
        paymentStatus: p.payment_status || null,
        createdAt: p.createdate,
        updatedAt: p.hs_lastmodifieddate,
      }),
    ),
    overdueTasks,
    companies,
    dealUrl: (id) => `${base}/contacts/${hubspotConfig.portalId}/record/0-3/${id}`,
    taskUrl: () => `${base}/tasks/${hubspotConfig.portalId}/view/all`,
  }
}

export async function sendHubSpotWeeklyReport(
  options: { dryRun?: boolean; today?: string } = {},
): Promise<string> {
  if (!hubspotConfig.configured) return 'no HUBSPOT_TOKEN; weekly report skipped'
  const message = reportEmail(await collectReport(options.today ?? chinaToday()))
  const output = `${message.subject}\n\n${message.text}`
  if (options.dryRun) return output

  const to = hubspotConfig.reportTo.length ? hubspotConfig.reportTo : emailConfig.notifyTo
  if (!emailConfig.configured || to.length === 0) {
    console.log('[hubspot] no email provider configured (RESEND_API_KEY); report not sent')
    return output
  }
  const payload = await getPayloadClient()
  try {
    await payload.sendEmail({
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
    console.log(`[hubspot] weekly report sent to ${to.join(', ')}`)
  } catch (error) {
    console.error(`[hubspot] weekly report failed: ${(error as Error).message}`)
  }
  return output
}
