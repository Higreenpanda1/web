/**
 * The latest videos from the company YouTube channel, for the homepage
 * "Explore China" section.
 *
 * Read from the channel's public RSS feed, which needs no API key. The feed
 * lists the newest uploads first, so the first five are the latest five.
 * Cached for an hour; if YouTube cannot be reached the section simply does
 * not render rather than showing an empty frame.
 */

/** youtube.com/@Higreenpanda. Set YOUTUBE_CHANNEL_ID in .env to point elsewhere. */
const DEFAULT_CHANNEL_ID = 'UCZMOTEI2d2sQNH6Yn1NIpeQ'

export type YoutubeVideo = {
  id: string
  title: string
  published: string
  url: string
  thumbnail: string
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
}

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, (entity) => ENTITIES[entity] ?? entity)
}

const tag = (xml: string, name: string) =>
  xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? ''

/** Exported for tests. */
export function parseFeed(xml: string, limit: number): YoutubeVideo[] {
  const entries = xml.split('<entry>').slice(1)
  const videos: YoutubeVideo[] = []
  for (const entry of entries) {
    const id = tag(entry, 'yt:videoId')
    // Video ids are 11 url-safe characters; anything else is not a video.
    if (!/^[\w-]{11}$/.test(id)) continue
    videos.push({
      id,
      title: decode(tag(entry, 'title')),
      published: tag(entry, 'published'),
      url: `https://www.youtube.com/watch?v=${id}`,
      // hqdefault exists for every video, Shorts included.
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    })
    if (videos.length >= limit) break
  }
  return videos
}

export async function getLatestVideos(limit = 5): Promise<YoutubeVideo[]> {
  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID
  try {
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) },
    )
    if (!response.ok) return []
    return parseFeed(await response.text(), limit)
  } catch {
    return []
  }
}
