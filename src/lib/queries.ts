import { unstable_cache } from 'next/cache'

import { getPayloadClient } from './payload'

import type { Locale } from '@/i18n/routing'
import type {
  Category,
  Page,
  Post,
  Service,
  SiteSetting,
  TeamMember,
  Testimonial,
} from '@/payload-types'

/**
 * Every read the public site performs, in one place.
 *
 * Each query is wrapped in `unstable_cache` with a tag, so a page render costs
 * no database round trip once warm, and publishing from the CMS invalidates
 * exactly the tag it touches (see src/lib/revalidate.ts). Cache keys always
 * include the locale — an Arabic render and an English one are different
 * documents as far as the cache is concerned.
 */

export const CACHE_TAGS = {
  pages: 'pages',
  services: 'services',
  posts: 'posts',
  categories: 'categories',
  testimonials: 'testimonials',
  team: 'team-members',
  settings: 'site-settings',
  redirects: 'redirects',
} as const

const ONE_HOUR = 3600

export const getSiteSettings = (locale: Locale) =>
  unstable_cache(
    async (): Promise<SiteSetting> => {
      const payload = await getPayloadClient()
      return payload.findGlobal({ slug: 'site-settings', locale, depth: 1 })
    },
    ['site-settings', locale],
    { tags: [CACHE_TAGS.settings], revalidate: ONE_HOUR },
  )()

export const getPageBySlug = (slug: string, locale: Locale) =>
  unstable_cache(
    async (): Promise<Page | null> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'pages',
        where: { slug: { equals: slug }, _status: { equals: 'published' } },
        locale,
        depth: 2,
        limit: 1,
      })
      return result.docs[0] ?? null
    },
    ['page', slug, locale],
    { tags: [CACHE_TAGS.pages], revalidate: ONE_HOUR },
  )()

export const getServices = (
  locale: Locale,
  options: { featuredOnly?: boolean; limit?: number } = {},
) =>
  unstable_cache(
    async (): Promise<Service[]> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'services',
        where: {
          _status: { equals: 'published' },
          ...(options.featuredOnly ? { featured: { equals: true } } : {}),
        },
        locale,
        sort: 'order',
        limit: options.limit ?? 50,
        depth: 1,
      })
      return result.docs
    },
    ['services', locale, String(options.featuredOnly ?? false), String(options.limit ?? 50)],
    { tags: [CACHE_TAGS.services], revalidate: ONE_HOUR },
  )()

export const getServiceBySlug = (slug: string, locale: Locale) =>
  unstable_cache(
    async (): Promise<Service | null> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'services',
        where: { slug: { equals: slug }, _status: { equals: 'published' } },
        locale,
        depth: 2,
        limit: 1,
      })
      return result.docs[0] ?? null
    },
    ['service', slug, locale],
    { tags: [CACHE_TAGS.services], revalidate: ONE_HOUR },
  )()

export type PostPage = {
  docs: Post[]
  totalPages: number
  page: number
  totalDocs: number
}

export const getPosts = (
  locale: Locale,
  options: { page?: number; limit?: number; category?: string } = {},
) =>
  unstable_cache(
    async (): Promise<PostPage> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          publishedAt: { less_than_equal: new Date().toISOString() },
          // An Arabic-only article is not listed on the English site.
          ...(locale === 'en' ? { localesAvailable: { contains: 'en' } } : {}),
          ...(options.category ? { 'categories.slug': { equals: options.category } } : {}),
        },
        locale,
        sort: '-publishedAt',
        page: options.page ?? 1,
        limit: options.limit ?? 9,
        depth: 1,
      })
      return {
        docs: result.docs,
        totalPages: result.totalPages,
        page: result.page ?? 1,
        totalDocs: result.totalDocs,
      }
    },
    [
      'posts',
      locale,
      String(options.page ?? 1),
      String(options.limit ?? 9),
      options.category ?? 'all',
    ],
    { tags: [CACHE_TAGS.posts], revalidate: ONE_HOUR },
  )()

export const getPostBySlug = (slug: string, locale: Locale) =>
  unstable_cache(
    async (): Promise<Post | null> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'posts',
        where: {
          slug: { equals: slug },
          _status: { equals: 'published' },
          // A scheduled article is not reachable before its time, even by URL.
          publishedAt: { less_than_equal: new Date().toISOString() },
        },
        locale,
        depth: 2,
        limit: 1,
      })
      return result.docs[0] ?? null
    },
    ['post', slug, locale],
    { tags: [CACHE_TAGS.posts], revalidate: ONE_HOUR },
  )()

export const getCategories = (locale: Locale) =>
  unstable_cache(
    async (): Promise<Category[]> => {
      const payload = await getPayloadClient()
      const result = await payload.find({ collection: 'categories', locale, limit: 50, depth: 0 })
      return result.docs
    },
    ['categories', locale],
    { tags: [CACHE_TAGS.categories], revalidate: ONE_HOUR },
  )()

export const getTestimonials = (locale: Locale, featuredOnly = true) =>
  unstable_cache(
    async (): Promise<Testimonial[]> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'testimonials',
        where: featuredOnly ? { featured: { equals: true } } : {},
        locale,
        sort: 'order',
        limit: 12,
        depth: 1,
      })
      return result.docs
    },
    ['testimonials', locale, String(featuredOnly)],
    { tags: [CACHE_TAGS.testimonials], revalidate: ONE_HOUR },
  )()

export const getTeam = (locale: Locale) =>
  unstable_cache(
    async (): Promise<TeamMember[]> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'team-members',
        locale,
        sort: 'order',
        limit: 30,
        depth: 1,
      })
      return result.docs
    },
    ['team', locale],
    { tags: [CACHE_TAGS.team], revalidate: ONE_HOUR },
  )()

export const getFounder = async (locale: Locale): Promise<TeamMember | null> => {
  const team = await getTeam(locale)
  return team.find((member) => member.isFounder) ?? team[0] ?? null
}

/** Slugs for generateStaticParams and the sitemap. Not locale-specific: slugs
 *  are shared between languages by design. */
export const getAllSlugs = (collection: 'services' | 'posts' | 'pages') =>
  unstable_cache(
    async (): Promise<Array<{ slug: string; updatedAt: string; locales: Locale[] }>> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection,
        where: {
          _status: { equals: 'published' },
          ...(collection === 'posts'
            ? { publishedAt: { less_than_equal: new Date().toISOString() } }
            : {}),
        },
        limit: 1000,
        depth: 0,
        select: {
          slug: true,
          updatedAt: true,
          ...(collection === 'posts' ? { localesAvailable: true } : {}),
        },
      })
      return result.docs.flatMap((doc) => {
        const record = doc as {
          slug?: string | null
          updatedAt?: string | null
          localesAvailable?: Locale[] | null
        }
        if (!record.slug) return []
        const locales = record.localesAvailable?.length
          ? record.localesAvailable
          : (['ar', 'en'] as Locale[])
        return [{ slug: record.slug, updatedAt: record.updatedAt ?? '', locales }]
      })
    },
    ['slugs', collection],
    { tags: [CACHE_TAGS[collection]], revalidate: ONE_HOUR },
  )()

export const getCategoryBySlug = (slug: string, locale: Locale) =>
  unstable_cache(
    async (): Promise<Category | null> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'categories',
        where: { slug: { equals: slug } },
        locale,
        limit: 1,
        depth: 0,
      })
      return result.docs[0] ?? null
    },
    ['category', slug, locale],
    { tags: [CACHE_TAGS.categories], revalidate: ONE_HOUR },
  )()

/** How many published articles each category holds, keyed by category id. */
export const getCategoryCounts = (locale: Locale) =>
  unstable_cache(
    async (): Promise<Record<number, number>> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          publishedAt: { less_than_equal: new Date().toISOString() },
          ...(locale === 'en' ? { localesAvailable: { contains: 'en' } } : {}),
        },
        limit: 1000,
        depth: 0,
        select: { categories: true },
      })
      const counts: Record<number, number> = {}
      for (const doc of result.docs) {
        for (const entry of (doc as { categories?: Array<number | { id: number }> }).categories ??
          []) {
          const id = typeof entry === 'object' ? entry.id : entry
          counts[id] = (counts[id] ?? 0) + 1
        }
      }
      return counts
    },
    ['category-counts', locale],
    { tags: [CACHE_TAGS.posts], revalidate: ONE_HOUR },
  )()

/** The article before and after this one, by publish date. */
export const getAdjacentPosts = (post: Post, locale: Locale) =>
  unstable_cache(
    async (): Promise<{ previous: Post | null; next: Post | null }> => {
      const payload = await getPayloadClient()
      const base = {
        _status: { equals: 'published' as const },
        publishedAt: { less_than_equal: new Date().toISOString() },
        ...(locale === 'en' ? { localesAvailable: { contains: 'en' as const } } : {}),
      }
      const [older, newer] = await Promise.all([
        payload.find({
          collection: 'posts',
          where: { ...base, publishedAt: { less_than: post.publishedAt } },
          locale,
          sort: '-publishedAt',
          limit: 1,
          depth: 0,
          select: { title: true, slug: true, publishedAt: true },
        }),
        payload.find({
          collection: 'posts',
          where: {
            ...base,
            publishedAt: {
              greater_than: post.publishedAt,
              less_than_equal: new Date().toISOString(),
            },
          },
          locale,
          sort: 'publishedAt',
          limit: 1,
          depth: 0,
          select: { title: true, slug: true, publishedAt: true },
        }),
      ])
      return {
        previous: (older.docs[0] as Post | undefined) ?? null,
        next: (newer.docs[0] as Post | undefined) ?? null,
      }
    },
    ['adjacent', String(post.id), locale],
    { tags: [CACHE_TAGS.posts], revalidate: ONE_HOUR },
  )()

/** Latest articles sharing a category with this one, for the "related" block
 *  when an editor has not chosen any. */
export const getRelatedPosts = (post: Post, locale: Locale, limit = 3) =>
  unstable_cache(
    async (): Promise<Post[]> => {
      const payload = await getPayloadClient()
      const categoryIds = (post.categories ?? []).map((entry) =>
        typeof entry === 'object' && entry !== null ? entry.id : entry,
      )
      const result = await payload.find({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          publishedAt: { less_than_equal: new Date().toISOString() },
          id: { not_equals: post.id },
          ...(locale === 'en' ? { localesAvailable: { contains: 'en' } } : {}),
          ...(categoryIds.length ? { categories: { in: categoryIds } } : {}),
        },
        locale,
        sort: '-publishedAt',
        limit,
        depth: 1,
      })
      return result.docs
    },
    ['related', String(post.id), locale, String(limit)],
    { tags: [CACHE_TAGS.posts], revalidate: ONE_HOUR },
  )()

/** Every live article in one locale, newest first — for the feed and llms.txt. */
export const getAllPosts = (locale: Locale, options: { depth?: number; limit?: number } = {}) =>
  unstable_cache(
    async (): Promise<Post[]> => {
      const payload = await getPayloadClient()
      const result = await payload.find({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          publishedAt: { less_than_equal: new Date().toISOString() },
          ...(locale === 'en' ? { localesAvailable: { contains: 'en' } } : {}),
        },
        locale,
        sort: '-publishedAt',
        limit: options.limit ?? 1000,
        depth: options.depth ?? 1,
      })
      return result.docs
    },
    ['all-posts', locale, String(options.depth ?? 1), String(options.limit ?? 1000)],
    { tags: [CACHE_TAGS.posts], revalidate: ONE_HOUR },
  )()
