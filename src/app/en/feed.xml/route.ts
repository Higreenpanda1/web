import { buildRssFeed } from '@/lib/feeds'

/** English RSS feed. */
export const dynamic = 'force-dynamic'

export async function GET() {
  return new Response(await buildRssFeed('en'), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, s-maxage=900',
    },
  })
}
