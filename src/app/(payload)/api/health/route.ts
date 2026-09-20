import { getPayloadClient } from '@/lib/payload'

/**
 * Liveness plus a real database round trip — a container that is up but cannot
 * reach Postgres is not healthy, and Docker's healthcheck should say so.
 * Deliberately terse: it is polled every 30 seconds and leaks nothing.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayloadClient()
    await payload.count({ collection: 'services' })
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json(
      { status: 'degraded' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
