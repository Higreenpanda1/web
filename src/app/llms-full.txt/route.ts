import { buildLlmsFullTxt } from '@/lib/feeds'

/** llms-full.txt — the whole blog as plain text, for assistants that want the content, not just the index. */
export const dynamic = 'force-dynamic'

export async function GET() {
  return new Response(await buildLlmsFullTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
