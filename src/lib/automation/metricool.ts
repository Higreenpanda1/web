/**
 * Metricool is where the owner already schedules Instagram, Facebook, TikTok
 * and YouTube (HANDOVER.md). When an article goes live the distribution job
 * schedules one post per connected network through Metricool's public API, so
 * the audience — which lives on social, not on the site (brief section 7) —
 * hears about it without anyone copying links by hand.
 *
 * Configuration, all optional. Without a token the job logs and does nothing.
 *
 *   METRICOOL_TOKEN     API token from Metricool → Settings → API.
 *   METRICOOL_USER_ID   The account's user id (4648321 for this brand).
 *   METRICOOL_BLOG_ID   The brand id (6019177 for "higreenpanda").
 *   METRICOOL_NETWORKS  Comma-separated; default "facebook,instagram".
 *   METRICOOL_TIMEZONE  IANA zone for the publish time; default Asia/Shanghai.
 *   METRICOOL_AUTOPUBLISH  "false" sends a push notification to the owner's
 *                          phone to publish by hand instead of auto-posting.
 *
 * Instagram and TikTok refuse a post with no image, so a network is skipped
 * when the article has no cover. YouTube needs a video and is never targeted.
 */

const API = 'https://app.metricool.com/api'

export type SocialPost = {
  text: string
  imageUrl?: string | null
  /** Where the link should point. Appended to the text for networks that show links. */
  url: string
  /** When to publish, ISO 8601 with offset. Defaults to a few minutes from now. */
  at?: Date
}

type MetricoolConfig = {
  token: string
  userId: string
  blogId: string
  networks: string[]
  timezone: string
  autoPublish: boolean
}

export function metricoolConfig(): MetricoolConfig | null {
  const token = process.env.METRICOOL_TOKEN?.trim()
  const userId = process.env.METRICOOL_USER_ID?.trim()
  const blogId = process.env.METRICOOL_BLOG_ID?.trim()
  if (!token || !userId || !blogId) return null
  const networks = (process.env.METRICOOL_NETWORKS ?? 'facebook,instagram')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return {
    token,
    userId,
    blogId,
    networks,
    timezone: process.env.METRICOOL_TIMEZONE?.trim() || 'Asia/Shanghai',
    autoPublish: process.env.METRICOOL_AUTOPUBLISH !== 'false',
  }
}

const NEEDS_IMAGE = new Set(['instagram', 'tiktok', 'pinterest'])
const NEEDS_VIDEO = new Set(['youtube'])

/** Schedule one Metricool post per configured network. Returns the networks it reached. */
export async function scheduleSocialPost(post: SocialPost): Promise<string[]> {
  const config = metricoolConfig()
  if (!config) return []

  const when = post.at ?? new Date(Date.now() + 10 * 60_000)
  const dateTime = formatInZone(when, config.timezone)
  const reached: string[] = []

  for (const network of config.networks) {
    if (NEEDS_VIDEO.has(network)) continue
    if (NEEDS_IMAGE.has(network) && !post.imageUrl) continue

    const text = NEEDS_IMAGE.has(network)
      ? `${post.text}\n\n${post.url}`
      : `${post.text}\n\n${post.url}`
    const body = {
      autoPublish: config.autoPublish,
      draft: false,
      hasNotReadNotes: false,
      descendants: [],
      firstCommentText: '',
      media: post.imageUrl ? [post.imageUrl] : [],
      mediaAltText: [],
      providers: [{ network }],
      publicationDate: { dateTime, timezone: config.timezone },
      shortener: false,
      smartLinkData: { ids: [] },
      text,
      ...(network === 'facebook' ? { facebookData: { type: 'POST' } } : {}),
      ...(network === 'instagram' ? { instagramData: { type: 'POST' } } : {}),
      ...(network === 'linkedin' ? { linkedinData: { type: 'post' } } : {}),
      ...(network === 'twitter' ? { twitterData: { tags: [] } } : {}),
    }

    const response = await fetch(
      `${API}/v2/scheduler/posts?userId=${encodeURIComponent(config.userId)}&blogId=${encodeURIComponent(config.blogId)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mc-Auth': config.token,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (response.ok) {
      reached.push(network)
    } else {
      const detail = (await response.text()).slice(0, 300)
      console.warn(`[metricool] ${network} refused (${response.status}): ${detail}`)
    }
  }
  return reached
}

/** "YYYY-MM-DDTHH:mm:ss" as a wall-clock time in the given IANA zone. */
function formatInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}
