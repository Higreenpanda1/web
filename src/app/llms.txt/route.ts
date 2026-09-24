import { buildLlmsTxt } from '@/lib/feeds'

/**
 * llms.txt — what AI crawlers and assistants read to understand the site.
 * The convention: a short description, then links with one-line summaries.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  return new Response(await buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
