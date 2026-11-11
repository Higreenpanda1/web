/**
 * The in-process scheduler behind src/instrumentation.ts.
 *
 * Kept deliberately small: a few intervals and daily gates, no job table, no
 * locking. There is exactly one app container, so there is nothing to lock
 * against. If the site ever runs on more than one instance, move these jobs
 * to Payload's job queue or a single cron container — the job functions are
 * already free-standing and will not need to change.
 */
const DISTRIBUTE_EVERY_MS = 10 * 60_000
/**
 * Hour (China time) after which the daily content jobs may run. Three in the
 * morning in Shenzhen is ten at night in Riyadh: research and writing happen
 * while the audience sleeps, and an article published with a two-day delay
 * goes live in their working day.
 */
const CONTENT_JOBS_AFTER_HOUR = 3

/**
 * HubSpot jobs (src/lib/hubspot-ops.ts) run at nine in the morning China time,
 * when the team starts work: renewal reminders daily, the report on Mondays.
 * Only inside a short window, so a restart in the afternoon does not send the
 * report twice; a server that is down all morning skips a day, and the
 * reminders catch up the next morning because a renewal stays due for weeks.
 */
const HUBSPOT_JOBS_HOUR = 9
const HUBSPOT_JOBS_UNTIL_HOUR = 12

/**
 * Portal accounts for clients who have paid (src/lib/portal/auto-accounts.ts):
 * a few HubSpot calls an hour, so a client is welcomed within the hour of the
 * team moving their deal to a paid stage.
 */
const PORTAL_ACCOUNTS_EVERY_MS = 60 * 60_000

let started = false
let lastContentRunDay = ''
let lastHubSpotRunDay = ''

export function startScheduler(): void {
  if (started) return
  started = true

  // The first distribution pass runs a minute after boot, so a deploy that
  // ships scheduled articles announces them without waiting a full interval —
  // and so the database has had time to come up.
  setTimeout(() => void tick('distribute', runDistribute), 60_000).unref()
  setInterval(() => void tick('distribute', runDistribute), DISTRIBUTE_EVERY_MS).unref()

  setTimeout(() => void tick('content', runDailyContentJobs), 5 * 60_000).unref()
  setInterval(() => void tick('content', runDailyContentJobs), 60 * 60_000).unref()

  setInterval(() => void tick('hubspot', runHubSpotJobs), 15 * 60_000).unref()

  setTimeout(() => void tick('portal-accounts', runPortalAccounts), 3 * 60_000).unref()
  setInterval(
    () => void tick('portal-accounts', runPortalAccounts),
    PORTAL_ACCOUNTS_EVERY_MS,
  ).unref()

  console.log('[automation] scheduler started')
}

async function runDistribute(): Promise<void> {
  const { distributeNewPosts } = await import('./distribute')
  const { announced } = await distributeNewPosts()
  if (announced.length > 0) console.log(`[automation] announced ${announced.join(', ')}`)
}

async function runDailyContentJobs(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return
  const today = chinaDateKey()
  if (lastContentRunDay === today) return
  if (chinaHour() < CONTENT_JOBS_AFTER_HOUR) return
  lastContentRunDay = today

  const { runContentJobs } = await import('./drafts')
  await runContentJobs()
}

async function runHubSpotJobs(): Promise<void> {
  if (!process.env.HUBSPOT_TOKEN || process.env.HUBSPOT_AUTOMATION === 'off') return
  const today = chinaDateKey()
  if (lastHubSpotRunDay === today) return
  const hour = chinaHour()
  if (hour < HUBSPOT_JOBS_HOUR || hour >= HUBSPOT_JOBS_UNTIL_HOUR) return
  lastHubSpotRunDay = today

  const { runRenewalReminders, sendHubSpotWeeklyReport } = await import('@/lib/hubspot-ops')
  const { done } = await runRenewalReminders({ today })
  if (done.length > 0) console.log(`[automation] renewal reminders: ${done.join('; ')}`)
  if (chinaWeekday() === 'Mon') await sendHubSpotWeeklyReport({ today })
}

async function runPortalAccounts(): Promise<void> {
  if (!process.env.HUBSPOT_TOKEN || process.env.HUBSPOT_AUTOMATION === 'off') return
  const { openAccountsForPaidClients } = await import('@/lib/portal/auto-accounts')
  const { opened, emailed, failed } = await openAccountsForPaidClients()
  if (opened.length > 0) console.log(`[automation] portal accounts opened: ${opened.join('; ')}`)
  if (emailed.length > 0) console.log(`[automation] portal welcome sent: ${emailed.join('; ')}`)
  if (failed.length > 0) console.error(`[automation] portal accounts failed: ${failed.join('; ')}`)
}

async function tick(name: string, job: () => Promise<void>): Promise<void> {
  try {
    await job()
  } catch (error) {
    console.error(`[automation] ${name} failed: ${(error as Error).message}`)
  }
}

function chinaHour(): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  )
}

function chinaDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
}

function chinaWeekday(): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', weekday: 'short' }).format(
    new Date(),
  )
}
