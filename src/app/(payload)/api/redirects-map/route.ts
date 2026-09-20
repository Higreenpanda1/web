import { getPayloadClient } from '@/lib/payload'

/**
 * The redirect table, for middleware.
 *
 * Middleware runs on the edge runtime and cannot open a Postgres connection, so
 * it fetches this once a minute and caches the result in module memory. That is
 * one internal request per minute rather than a database round trip per
 * visitor.
 *
 * Nothing here is sensitive — it is a list of paths that are already public by
 * definition — so it needs no auth, and the response is cached for a minute so
 * even a direct hammering costs nothing.
 */
/**
 * Rendered per request, not prerendered at build time.
 *
 * Same reason as the sitemap: `docker build` cannot reach the database, so
 * prerendering this shipped `{"rules":[]}` inside the image and every deploy
 * served no redirects at all until the first revalidation. The old site's URLs
 * are the entire point of this table, so a window where none of them work is
 * not acceptable — and it is exactly the window a redeploy creates.
 *
 * Middleware caches the result in memory for a minute, so this is hit about
 * once a minute per instance, not once per visitor.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'redirects',
      where: { enabled: { equals: true } },
      limit: 2000,
      depth: 0,
      select: { from: true, to: true, type: true },
    })

    return Response.json(
      {
        rules: result.docs.map((doc) => ({
          from: doc.from,
          to: doc.to ?? null,
          type: doc.type,
        })),
      },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' } },
    )
  } catch (error) {
    console.error('[redirects-map] could not load redirects', error)
    // An empty table is the safe failure: visitors reach the site, they just
    // miss a redirect until the database is back.
    return Response.json({ rules: [] }, { status: 200 })
  }
}
