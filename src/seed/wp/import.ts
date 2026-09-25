import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'

/**
 * Imports the blog recovered from the old WordPress site.
 *
 * `posts.json` is generated from the owner's Hostinger backup (the `.sql.gz`
 * dump and `wp-content/uploads`): 112 articles, 100 of them in both languages,
 * with their Gutenberg HTML already converted to Lexical, their Yoast
 * descriptions, their cover images (re-encoded to WebP in ./media) and the
 * URLs they had, which become 301 redirects. Two video-only articles arrive as
 * drafts. The generator lives outside the repository; the JSON is the source
 * of truth here.
 *
 * Idempotent and cheap to re-run: every article carries an `importKey` — a
 * hash of its source — and an article whose key has not changed is skipped
 * without a write. An editor's later changes are never overwritten unless the
 * source itself changes, and the import never publishes anything an editor
 * has since unpublished.
 */

type LocaleDoc = {
  legacyId: string
  title: string
  excerpt: string
  seoDescription: string
  focusKeyword: string | null
  body: { root: Record<string, unknown> }
  wordCount: number
  keyTakeaways?: string[]
  faqs?: Array<{ question: string; answer: string }>
  sources?: Array<{ title: string; url: string; publisher?: string }>
}

type ImportedPost = {
  slug: string
  publishedAt: string
  status: 'published' | 'draft'
  categories: string[]
  /** Slug of the service the article leads to (the card after the article). */
  service?: string | null
  cover: { file: string; alt: { ar: string; en: string } } | null
  images: Array<{ file: string; alt: string }>
  legacy: Partial<Record<'ar' | 'en', { id: string; path: string }>>
  locales: { ar: LocaleDoc | null; en: LocaleDoc | null }
}

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MEDIA_DIR = path.join(HERE, 'media')

export async function importWordPressPosts(
  payload: Payload,
  { founderId, categoryIds }: { founderId: number; categoryIds: Map<string, number> },
): Promise<void> {
  const posts = (
    JSON.parse(readFileSync(path.join(HERE, 'posts.json'), 'utf8')) as { posts: ImportedPost[] }
  ).posts
  let created = 0
  let updated = 0
  let skipped = 0
  let redirects = 0
  const serviceIds = new Map<string, number>()
  for (const service of (
    await payload.find({ collection: 'services', limit: 100, depth: 0, select: { slug: true } })
  ).docs) {
    serviceIds.set(service.slug, service.id)
  }

  for (const post of posts) {
    const importKey = fingerprint(post)
    const existing = await payload.find({
      collection: 'posts',
      where: { slug: { equals: post.slug } },
      limit: 1,
      depth: 0,
      draft: true,
    })
    const found = existing.docs[0]
    if (found && found.importKey === importKey) {
      skipped++
      continue
    }

    const coverId = post.cover
      ? await upsertMedia(payload, path.join(MEDIA_DIR, post.cover.file), post.cover.alt)
      : null
    const imageIds = new Map<string, number>()
    for (const image of post.images) {
      const id = await upsertMedia(payload, path.join(MEDIA_DIR, image.file), {
        ar: image.alt,
        en: image.alt,
      })
      if (id) imageIds.set(image.file, id)
    }

    const primary = post.locales.ar ?? post.locales.en
    if (!primary) continue
    const locales = (['ar', 'en'] as const).filter((locale) => post.locales[locale])
    const arabic = post.locales.ar ?? post.locales.en!

    const base = {
      slug: post.slug,
      title: arabic.title,
      excerpt: arabic.excerpt,
      body: resolveUploads(arabic.body, imageIds),
      focusKeyword: arabic.focusKeyword ?? undefined,
      keyTakeaways: (arabic.keyTakeaways ?? []).map((text) => ({ text })),
      faqs: arabic.faqs ?? [],
      sources: arabic.sources ?? [],
      seo: { description: arabic.seoDescription },
      publishedAt: post.publishedAt,
      ...(post.service && serviceIds.get(post.service)
        ? { ctaService: serviceIds.get(post.service) }
        : {}),
      author: founderId,
      categories: post.categories.flatMap((slug) => {
        const id = categoryIds.get(slug)
        return id ? [id] : []
      }),
      localesAvailable: locales,
      legacyPaths: Object.values(post.legacy).map((entry) => ({ path: entry.path })),
      importKey,
      ...(coverId ? { coverImage: coverId } : {}),
      // Never re-publish what an editor has unpublished.
      _status: found?._status === 'draft' ? 'draft' : post.status,
    }

    let id: number
    try {
      id = found
        ? (
            await payload.update({
              collection: 'posts',
              id: found.id,
              locale: 'ar',
              data: base as never,
            })
          ).id
        : (await payload.create({ collection: 'posts', locale: 'ar', data: base as never })).id
    } catch (error) {
      // Name the article, so a validation failure is a one-line fix rather than a hunt.
      const detail = (error as { data?: { errors?: unknown } }).data?.errors
      console.error(`  failed on ${post.slug}: ${(error as Error).message}`, detail ?? '')
      throw error
    }

    if (post.locales.en) {
      const english = post.locales.en
      await payload.update({
        collection: 'posts',
        id,
        locale: 'en',
        data: {
          title: english.title,
          excerpt: english.excerpt,
          body: resolveUploads(english.body, imageIds),
          focusKeyword: english.focusKeyword ?? undefined,
          keyTakeaways: (english.keyTakeaways ?? []).map((text) => ({ text })),
          faqs: english.faqs ?? [],
          sources: english.sources ?? [],
          seo: { description: english.seoDescription },
          _status: base._status,
        } as never,
      })
    }

    // The old URLs. Arabic slugs are stored decoded; the middleware decodes the
    // incoming path before matching, so both forms are caught.
    for (const [locale, entry] of Object.entries(post.legacy)) {
      if (!entry) continue
      const to = `${locale === 'en' ? '/en' : ''}/blog/${post.slug}`
      const from = entry.path.replace(/\/+$/, '') || '/'
      if (from === to) continue
      const rule = await payload.find({
        collection: 'redirects',
        where: { from: { equals: from } },
        limit: 1,
        depth: 0,
      })
      if (rule.docs.length === 0) {
        await payload.create({
          collection: 'redirects',
          data: {
            from,
            to,
            type: '301',
            enabled: true,
            note: `Old WordPress article (post ${entry.id}).`,
          },
        })
        redirects++
      }
    }

    if (found) updated++
    else created++
  }

  console.log(
    `  ${posts.length} articles: ${created} created, ${updated} updated, ${skipped} unchanged; ${redirects} redirects added`,
  )
}

function fingerprint(post: ImportedPost): string {
  return createHash('sha256').update(JSON.stringify(post)).digest('hex').slice(0, 24)
}

/** Replace the `{__media, __alt}` placeholders the converter left in upload nodes with real media ids. */
function resolveUploads(body: { root: Record<string, unknown> }, imageIds: Map<string, number>) {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk).filter((child) => child !== null)
    if (node && typeof node === 'object') {
      const record = { ...(node as Record<string, unknown>) }
      if (record.type === 'upload' && record.value && typeof record.value === 'object') {
        const placeholder = record.value as { __media?: string }
        const id = placeholder.__media ? imageIds.get(placeholder.__media) : undefined
        if (!id) return null
        record.value = id
        record.fields = null
        return record
      }
      if (Array.isArray(record.children)) record.children = walk(record.children)
      return record
    }
    return node
  }
  return { root: walk(body.root) as Record<string, unknown> }
}

/**
 * Upload once, matched by file name. Unlike the founder photo (matched by alt
 * text) the alt here is the article title, which an editor may well improve —
 * the file name is the stable identity.
 */
async function upsertMedia(
  payload: Payload,
  filePath: string,
  alt: { ar: string; en: string },
): Promise<number | null> {
  const filename = path.basename(filePath)
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs[0]) return existing.docs[0].id

  try {
    const createdDoc = await payload.create({
      collection: 'media',
      locale: 'ar',
      data: { alt: alt.ar },
      filePath,
    })
    await payload.update({
      collection: 'media',
      id: createdDoc.id,
      locale: 'en',
      data: { alt: alt.en },
    })
    return createdDoc.id
  } catch (error) {
    console.warn(`  could not upload ${filename}: ${(error as Error).message}`)
    return null
  }
}
