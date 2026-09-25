/**
 * The in-process scheduler behind src/instrumentation.ts.
 *
 * Kept deliberately small: two intervals and a daily gate, no job table, no
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

let started = false
let lastContentRunDay = ''

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
