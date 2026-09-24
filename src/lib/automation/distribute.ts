import { revalidateTag } from 'next/cache'

import { serverURL } from '@/lib/env'
import { getPayloadClient } from '@/lib/payload'
import { CACHE_TAGS } from '@/lib/queries'
import { mediaUrl } from '@/lib/seo'
import { absoluteUrl } from '@/lib/url'

import { indexNowEnabled, submitToIndexNow } from './indexnow'
import { metricoolConfig, scheduleSocialPost } from './metricool'

import type { Locale } from '@/i18n/routing'
import type { Post } from '@/payload-types'

/**
 * Announce articles that have just gone live.
 *
 * "Gone live" means published in the CMS with a publish date that has now
 * passed and no Announcements row yet. That covers both an editor pressing
 * Publish and an article scheduled for next Tuesday at nine: the scheduler
 * (src/instrumentation.ts) runs this every few minutes, so a scheduled article
 * is announced within minutes of its time without anyone being awake.
 *
 * For each such article, in order:
 *   1. drop the posts cache so the list pages and sitemap show it at once
 *   2. submit its URLs to IndexNow (Bing, Yandex, Naver, Seznam, Yep)
 *   3. schedule one social post per network through Metricool — only for
 *      articles published in the last fortnight, so a bulk import is indexed
 *      but not broadcast
 *   4. record it in Announcements so it is never announced twice
 *
 * Every integration is optional and independently configured; with none of
 * them set the job still stamps the article, which keeps the bookkeeping
 * honest for the day a token is added.
 */
const SOCIAL_WINDOW_MS = 14 * 86_400_000

export async function distributeNewPosts(options: { dryRun?: boolean } = {}): Promise<{
  announced: string[]
}> {
  const payload = await getPayloadClient()
  const now = new Date().toISOString()

  // Announced articles are recorded in their own collection (see
  // src/collections/Announcements.ts); everything live and not yet there is due.
  const announced = await payload.find({
    collection: 'announcements',
    limit: 5000,
    depth: 0,
    select: { post: true },
  })
  const announcedIds = announced.docs.map((row) =>
    typeof row.post === 'object' ? row.post.id : row.post,
  )

  const due = await payload.find({
    collection: 'posts',
    where: {
      _status: { equals: 'published' },
      publishedAt: { less_than_equal: now },
      ...(announcedIds.length ? { id: { not_in: announcedIds } } : {}),
    },
    locale: 'ar',
    depth: 1,
    // Large enough to clear the imported archive in one pass after a deploy.
    limit: 200,
    sort: 'publishedAt',
  })

  if (due.docs.length === 0) return { announced: [] }

  // The sitemap and the blog index must show the article before search engines
  // are told about it, or the first crawl finds a URL the site does not list.
  safeRevalidate()

  const announcedSlugs: string[] = []
  for (const post of due.docs) {
    const channels: string[] = []
    const locales = localesOf(post)
    const urls = locales.map((locale) => absoluteUrl(locale, `/blog/${post.slug}`))

    if (options.dryRun) {
      console.log(`[distribute] would announce ${post.slug}: ${urls.join(', ')}`)
      announcedSlugs.push(post.slug)
      continue
    }

    if (indexNowEnabled()) {
      try {
        const result = await submitToIndexNow(urls)
        if (result.ok) channels.push('indexnow')
        console.log(
          `[distribute] indexnow ${post.slug}: ${result.ok ? 'accepted' : `status ${result.status}`}`,
        )
      } catch (error) {
        console.warn(`[distribute] indexnow failed for ${post.slug}: ${(error as Error).message}`)
      }
    }

    // Social posts only for articles published in the last two weeks. The
    // first run after the import stamps 112 old articles; announcing each of
    // them to Instagram would be spam, and IndexNow above is all they need.
    const recent = Date.now() - new Date(post.publishedAt).getTime() < SOCIAL_WINDOW_MS
    if (metricoolConfig() && recent) {
      try {
        const image =
          typeof post.coverImage === 'object' ? mediaUrl(post.coverImage, 'feature') : null
        // One social post, in Arabic, because that is where the audience is.
        // The English article is one click away through the language switcher.
        const arabic = await payload.findByID({
          collection: 'posts',
          id: post.id,
          locale: 'ar',
          depth: 0,
        })
        const reached = await scheduleSocialPost({
          text: socialText(arabic),
          imageUrl: image,
          url: absoluteUrl('ar', `/blog/${post.slug}`),
        })
        console.log(
          `[distribute] metricool ${post.slug}: ${reached.join(', ') || 'no network reached'}`,
        )
      } catch (error) {
        console.warn(`[distribute] metricool failed for ${post.slug}: ${(error as Error).message}`)
      }
    }

    await payload.create({
      collection: 'announcements',
      depth: 0,
      overrideAccess: true,
      data: { post: post.id, announcedAt: new Date().toISOString(), channels: channels.join(', ') },
    })
    announcedSlugs.push(post.slug)
  }

  return { announced: announcedSlugs }
}

/** Submit every published URL once — used after the import and by `npm run seo:indexnow`. */
export async function submitEverythingToIndexNow(): Promise<number> {
  if (!indexNowEnabled()) return 0
  const payload = await getPayloadClient()
  const posts = await payload.find({
    collection: 'posts',
    where: {
      _status: { equals: 'published' },
      publishedAt: { less_than_equal: new Date().toISOString() },
    },
    limit: 1000,
    depth: 0,
    select: { slug: true, localesAvailable: true },
  })
  const urls = [
    serverURL,
    `${serverURL}/en`,
    `${serverURL}/blog`,
    `${serverURL}/en/blog`,
    ...posts.docs.flatMap((post) =>
      localesOf(post as Post).map((locale) => absoluteUrl(locale, `/blog/${post.slug}`)),
    ),
  ]
  const result = await submitToIndexNow(urls)
  return result.ok ? urls.length : 0
}

export function localesOf(post: Pick<Post, 'localesAvailable'>): Locale[] {
  const available = (post.localesAvailable ?? ['ar', 'en']) as Locale[]
  return available.length > 0 ? available : ['ar']
}

function socialText(post: Post): string {
  const takeaways = (post.keyTakeaways ?? [])
    .slice(0, 3)
    .map((item) => `• ${item.text}`)
    .join('\n')
  const body = takeaways || post.excerpt
  return `${post.title}\n\n${body}`.slice(0, 1800)
}

function safeRevalidate(): void {
  try {
    revalidateTag(CACHE_TAGS.posts)
  } catch {
    // Outside a request context (CLI, scheduler on boot) there is no cache to
    // drop; the tag expires on its own within the hour.
  }
}
