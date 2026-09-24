import { indexNowKey } from '@/lib/automation/indexnow'

/**
 * Proves to IndexNow that this site owns the key it submits with. Without a
 * configured key the route answers 404, which is also what IndexNow expects
 * when a site does not take part.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  const key = indexNowKey()
  if (!key) return new Response('Not found', { status: 404 })
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
