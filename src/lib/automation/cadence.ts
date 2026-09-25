/**
 * When the content jobs run in the week. Days are China-time weekdays,
 * 0 = Sunday. The Gulf works Sunday to Thursday, so drafts are spread over
 * those days first: an article that goes live on a Friday waits two days for
 * its readers.
 */
const SPREAD: Record<number, number[]> = {
  1: [1],
  2: [1, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
}

/** The weekdays the draft job writes on. */
export function draftWeekdays(env: Record<string, string | undefined> = process.env): number[] {
  const explicit = env.DRAFT_WEEKDAYS?.trim()
  if (explicit) {
    const days = explicit
      .split(/[,\s]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    if (days.length) return Array.from(new Set(days)).sort()
  }
  const perWeek = Math.min(7, Math.max(0, Number(env.DRAFTS_PER_WEEK ?? '3') || 0))
  if (perWeek === 0) return []
  if (perWeek === 1 && env.DRAFT_WEEKDAY !== undefined) {
    const day = Number(env.DRAFT_WEEKDAY)
    return Number.isInteger(day) && day >= 0 && day <= 6 ? [day] : [1]
  }
  return SPREAD[perWeek] ?? SPREAD[3]!
}

/** The weekday the research job runs on (default Saturday, the day before the Gulf week). */
export function researchWeekday(env: Record<string, string | undefined> = process.env): number {
  const day = Number(env.RESEARCH_WEEKDAY ?? '6')
  return Number.isInteger(day) && day >= 0 && day <= 6 ? day : 6
}

export function chinaWeekday(now: Date = new Date()): number {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
  }).format(now)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name)
}

export function autopublishConfig(env: Record<string, string | undefined> = process.env) {
  const enabled = /^(true|1|yes|on)$/i.test(env.BLOG_AUTOPUBLISH?.trim() ?? '')
  const delayHours = Number(env.BLOG_PUBLISH_DELAY_HOURS ?? '48')
  return { enabled, delayHours: Number.isFinite(delayHours) && delayHours >= 0 ? delayHours : 48 }
}
