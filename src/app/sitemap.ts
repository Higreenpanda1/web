import { getAllSlugs } from '@/lib/queries'
import { absoluteUrl } from '@/lib/url'

import type { MetadataRoute } from 'next'

/**
 * Both locales, with hreflang alternates on every entry. Arabic is listed as
 * the canonical URL and x-default because it is the primary site, not a
 * fallback.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, posts, pages] = await Promise.all([
    getAllSlugs('services'),
    getAllSlugs('posts'),
    getAllSlugs('pages'),
  ])

  const staticRoutes: Array<{
    path: string
    priority: number
    changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  }> = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/services', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/contact', priority: 0.8, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
  ]

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: absoluteUrl('ar', route.path),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: {
      languages: {
        ar: absoluteUrl('ar', route.path),
        en: absoluteUrl('en', route.path),
        'x-default': absoluteUrl('ar', route.path),
      },
    },
  }))

  for (const { slug, updatedAt } of services) {
    entries.push(localisedEntry(`/services/${slug}`, updatedAt, 0.8, 'monthly'))
  }
  for (const { slug, updatedAt } of posts) {
    entries.push(localisedEntry(`/blog/${slug}`, updatedAt, 0.6, 'monthly'))
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
  updatedAt: string,
  priority: number,
  changeFrequency: 'weekly' | 'monthly',
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl('ar', path),
    lastModified: updatedAt ? new Date(updatedAt) : new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        ar: absoluteUrl('ar', path),
        en: absoluteUrl('en', path),
        'x-default': absoluteUrl('ar', path),
      },
    },
  }
}
