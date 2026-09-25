import { unstable_cache } from 'next/cache'

import { metricoolConfig } from './automation/metricool'
import { latestValue } from './metricool-timeline'

/**
 * Follower counts for the four connected networks, read from Metricool so the
 * numbers on the site follow the real accounts without anyone editing them.
 *
 * Metricool refreshes its own counts about once a day; the site asks at most
 * once an hour. Without METRICOOL_TOKEN (local development), or when a network
 * does not answer, the last known figure below is used, so the site never
 * shows a blank or a zero. Update these now and then; they are only a floor.
 */
export type Network = 'instagram' | 'tiktok' | 'youtube' | 'facebook'
export type FollowerCounts = Record<Network, number> & { total: number; live: boolean }

/** Last known counts, from Metricool on 2026-09-24. */
const FALLBACK: Record<Network, number> = {
  instagram: 44_674,
  tiktok: 37_813,
  youtube: 28_700,
  facebook: 15_322,
}

/**
 * Metricool's metric name for "followers" differs per network and has changed
 * over time, so each network lists candidates; the first that returns a
 * number wins.
 */
const METRICS: Record<Network, string[]> = {
  instagram: ['followers'],
  tiktok: ['followers_count', 'followers'],
  youtube: ['totalSubscribers', 'subscribers'],
  facebook: ['pageFollows', 'fbFollowers', 'followers'],
}

const API = 'https://app.metricool.com/api/v2/analytics/timelines'
const ONE_HOUR = 3600

export const getFollowerCounts = unstable_cache(fetchFollowerCounts, ['social-followers'], {
  tags: ['social-followers'],
  revalidate: ONE_HOUR,
})

async function fetchFollowerCounts(): Promise<FollowerCounts> {
  const config = metricoolConfig()
  const networks = Object.keys(FALLBACK) as Network[]
  const live = config
    ? await Promise.all(networks.map((network) => latestCount(network, config)))
    : networks.map(() => null)

  const counts = Object.fromEntries(
    networks.map((network, index) => [network, live[index] ?? FALLBACK[network]]),
  ) as Record<Network, number>
  return {
    ...counts,
    total: networks.reduce((sum, network) => sum + counts[network], 0),
    live: live.some((value) => value !== null),
  }
}

async function latestCount(
  network: Network,
  config: NonNullable<ReturnType<typeof metricoolConfig>>,
): Promise<number | null> {
  const to = new Date()
  const from = new Date(to.getTime() - 7 * 24 * 3600_000)
  for (const metric of METRICS[network]) {
    const params = new URLSearchParams({
      userId: config.userId,
      blogId: config.blogId,
      network,
      metric,
      subject: 'account',
      from: `${day(from)}T00:00:00`,
      to: `${day(to)}T23:59:59`,
      timezone: config.timezone,
    })
    try {
      const response = await fetch(`${API}?${params}`, {
        headers: { 'X-Mc-Auth': config.token },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })
      if (!response.ok) {
        console.warn(`[followers] ${network}/${metric} refused (${response.status})`)
        continue
      }
      const value = latestValue(await response.json())
      if (value !== null) return value
    } catch (error) {
      console.warn(`[followers] ${network}/${metric} failed: ${(error as Error).message}`)
    }
  }
  return null
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** "126,509" — Western Arabic digits in both locales, like every other stat. */
export function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}
