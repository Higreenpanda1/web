import { buildRssFeed } from '@/lib/feeds'

/** Arabic RSS feed. Rendered per request from cached queries; see src/lib/feeds.ts. */
export const dynamic = 'force-dynamic'

export async function GET() {
  return new Response(await buildRssFeed('ar'), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, s-maxage=900',
    },
  })
}
