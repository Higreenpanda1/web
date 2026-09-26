/**
 * The newest videos on the YouTube channel, for the homepage band.
 *
 * No API key: YouTube publishes every channel's latest uploads as an Atom
 * feed. The feed wants the channel ID (UC…), not the @handle, so unless
 * YOUTUBE_CHANNEL_ID is set we read the ID off the channel page once and
 * cache both requests for an hour. Any failure returns an empty list and the
 * band simply does not render.
 */

export type YouTubeVideo = {
  id: string
  title: string
  published: string
  url: string
  thumbnail: string
}

const ONE_HOUR = 60 * 60
const CHANNEL_ID = /^UC[\w-]{22}$/

async function resolveChannelId(channelUrl: string): Promise<string | null> {
  const fromEnv = process.env.YOUTUBE_CHANNEL_ID?.trim()
  if (fromEnv && CHANNEL_ID.test(fromEnv)) return fromEnv

  const direct = channelUrl.match(/\/channel\/(UC[\w-]{22})/)
  if (direct?.[1]) return direct[1]

  const response = await fetch(channelUrl, {
    headers: { 'accept-language': 'en' },
    next: { revalidate: ONE_HOUR * 24 },
  })
  if (!response.ok) return null
  const html = await response.text()
  const match =
    html.match(
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    ) ??
    html.match(/"externalId":"(UC[\w-]{22})"/) ??
    html.match(/"channelId":"(UC[\w-]{22})"/)
  return match?.[1] ?? null
}

function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export function parseFeed(xml: string, limit: number): YouTubeVideo[] {
  const videos: YouTubeVideo[] = []
  for (const [, entry = ''] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1]
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1]
    if (!id || !title) continue
    videos.push({
      id,
      title: decodeEntities(title.trim()),
      published: published ?? '',
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    })
    if (videos.length >= limit) break
  }
  return videos
}

export async function getLatestVideos(
  channelUrl: string | null | undefined,
  limit = 3,
): Promise<YouTubeVideo[]> {
  if (!channelUrl) return []
  try {
    const channelId = await resolveChannelId(channelUrl)
    if (!channelId) return []
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { next: { revalidate: ONE_HOUR } },
    )
    if (!response.ok) return []
    return parseFeed(await response.text(), limit)
  } catch (error) {
    console.warn(`YouTube feed unavailable: ${(error as Error).message}`)
    return []
  }
}
