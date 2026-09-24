import { getAllPosts, getAllSlugs, getCategories } from '@/lib/queries'
import { mediaUrl } from '@/lib/seo'
import { absoluteUrl } from '@/lib/url'

import { APPLICATION_TYPES } from '@/lib/catalogue'

import type { Locale } from '@/i18n/routing'
import type { MetadataRoute } from 'next'

/**
 * Both locales, with hreflang alternates on every entry. Arabic is listed as
 * the canonical URL and x-default because it is the primary site, not a
 * fallback. An article that exists only in Arabic gets no English alternate,
 * so a crawler is never sent to a page that would show it Arabic under /en.
 *
 * Articles carry their cover image, so image search has something to index.
 */
/**
 * Rendered per request, not prerendered at build time.
 *
 * `docker build` has no route to the database container, so a production image
 * is *always* built with Postgres unreachable. Prerendering this baked an empty
 * or stale sitemap into the image, and with a one-hour revalidate it stayed
 * wrong for an hour after every deploy — a crawler arriving in that window gets
 * a sitemap listing nothing.
 *
 * Per-request costs almost nothing: the slug queries go through
 * `unstable_cache` (src/lib/queries.ts), tag-invalidated on publish, and a
 * sitemap is fetched by crawlers, not by visitors.
 */
export const dynamic = 'force-dynamic'

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, pages, posts, categories] = await Promise.all([
    getAllSlugs('services'),
    getAllSlugs('pages'),
    getAllPosts('ar', { depth: 1 }),
    getCategories('ar'),
  ])

  const staticRoutes: Array<{ path: string; priority: number; changeFrequency: Frequency }> = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/services', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/blog', priority: 0.9, changeFrequency: 'daily' },
    { path: '/contact', priority: 0.8, changeFrequency: 'yearly' },
    ...APPLICATION_TYPES.map((type) => ({
      path: `/apply/${type}`,
      priority: 0.6,
      changeFrequency: 'yearly' as const,
    })),
    { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
  ]

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) =>
    localisedEntry(route.path, new Date(), route.priority, route.changeFrequency),
  )

  for (const { slug, updatedAt } of services) {
    entries.push(localisedEntry(`/services/${slug}`, updatedAt, 0.8, 'monthly'))
  }

  const latest = posts[0]?.updatedAt ?? posts[0]?.publishedAt
  for (const category of categories) {
    entries.push(
      localisedEntry(`/blog/category/${category.slug}`, latest ?? new Date(), 0.7, 'weekly'),
    )
  }

  for (const post of posts) {
    const locales = (
      post.localesAvailable?.length ? post.localesAvailable : ['ar', 'en']
    ) as Locale[]
    const image = typeof post.coverImage === 'object' ? mediaUrl(post.coverImage, 'feature') : null
    entries.push({
      ...localisedEntry(
        `/blog/${post.slug}`,
        post.updatedAt ?? post.publishedAt,
        0.7,
        'monthly',
        locales,
      ),
      ...(image ? { images: [image] } : {}),
    })
  }

  // `home` and the legal pages are already covered by the static list above.
  for (const { slug, updatedAt } of pages) {
    if (['home', 'privacy', 'terms'].includes(slug)) continue
    entries.push(localisedEntry(`/${slug}`, updatedAt, 0.5, 'monthly'))
  }

  return entries
}

function localisedEntry(
  path: string,
  updatedAt: string | Date,
  priority: number,
  changeFrequency: Frequency,
  locales: Locale[] = ['ar', 'en'],
): MetadataRoute.Sitemap[number] {
  const primary: Locale = locales.includes('ar') ? 'ar' : 'en'
  const languages: Record<string, string> = {}
  for (const locale of locales) languages[locale] = absoluteUrl(locale, path)
  languages['x-default'] = absoluteUrl(primary, path)
  return {
    url: absoluteUrl(primary, path),
    lastModified: updatedAt ? new Date(updatedAt) : new Date(),
    changeFrequency,
    priority,
    alternates: { languages },
  }
}
