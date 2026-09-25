import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { lexicalToPlainText } from '@/lib/lexical'
import { SERVICES } from '@/seed/content'

import {
  articleSchema,
  blocksLinks,
  blocksToLexical,
  blocksWordCount,
  type ArticleDraft,
} from './blocks'
import { VOICE } from './drafts'

/**
 * Rewrites the recovered archive in place: src/seed/wp/posts.json.
 *
 * The 2024–2026 WordPress articles were thin — many under 400 words, no
 * headings, no answers a reader could act on. This job takes each one, in
 * each language it exists in, and has Claude rewrite it as a full guide:
 * 1,300 to 1,900 words, H2/H3 structure, steps and checklists, figures with
 * ranges, three to six questions with answers, key takeaways, a focus
 * keyword, a meta description — and internal links to related articles and
 * to the service pages, chosen from an inventory it is given, so every link
 * points at a page that exists.
 *
 * It works on the JSON, not the database, on purpose: the result is a diff in
 * git that can be read before it goes anywhere, and `npm run seed` on the
 * server updates exactly the articles whose content changed (the importer
 * hashes each one). An editor's own edits in the CMS survive: the importer
 * only writes when the source hash changes, and after this job the hash
 * changes once.
 *
 * Resumable: each rewritten locale is stamped with `rewrittenAt`, the file is
 * saved after every article, and a re-run skips what is done.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ARCHIVE = path.resolve(HERE, '../../seed/wp/posts.json')
const MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-opus-5'

export type Locale = 'ar' | 'en'

export type LocaleDoc = {
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
  rewrittenAt?: string
  rewriteModel?: string
  originalWordCount?: number
}

export type ArchivePost = {
  slug: string
  publishedAt: string
  status: 'published' | 'draft'
  categories: string[]
  service?: string | null
  cover: unknown
  images: unknown[]
  legacy: unknown
  locales: { ar: LocaleDoc | null; en: LocaleDoc | null }
}

export type Archive = {
  categories: Array<{ slug: string; ar: string; en: string }>
  posts: ArchivePost[]
}

let client: Anthropic | null = null
function anthropic(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

export function loadArchive(): Archive {
  return JSON.parse(readFileSync(ARCHIVE, 'utf8')) as Archive
}

export function saveArchive(archive: Archive): void {
  writeFileSync(ARCHIVE, JSON.stringify(archive, null, 1) + '\n')
}

/** Pages this article may link to: same-category articles first, then the services. */
export function linkInventory(archive: Archive, post: ArchivePost, locale: Locale): string {
  const prefix = locale === 'en' ? '/en' : ''
  const related = archive.posts
    .filter(
      (other) => other.slug !== post.slug && other.status === 'published' && other.locales[locale],
    )
    .map((other) => ({
      url: `${prefix}/blog/${other.slug}`,
      title: other.locales[locale]!.title,
      shared: other.categories.filter((category) => post.categories.includes(category)).length,
    }))
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 14)
  const services = SERVICES.slice(0, 20).map((service) => ({
    url: `${prefix}/services/${service.slug}`,
    title: service[locale].title,
  }))
  const lines = [
    ...related.map((entry) => `- ${entry.url} — ${entry.title}`),
    ...services.map((entry) => `- ${entry.url} — ${entry.title} (service page)`),
    `- ${prefix}/apply/consultation — ${locale === 'ar' ? 'حجز استشارة' : 'Book a consultation'}`,
  ]
  return lines.join('\n')
}

export function targetWords(original: number): [number, number] {
  if (original >= 1400) return [Math.round(original * 1.15), Math.round(original * 1.5)]
  return [1300, 1900]
}

export async function rewriteOne(
  archive: Archive,
  post: ArchivePost,
  locale: Locale,
): Promise<ArticleDraft | null> {
  const doc = post.locales[locale]
  if (!doc) return null
  const original = lexicalToPlainText(doc.body)
  const originalWords = original.split(/\s+/).filter(Boolean).length
  const [minWords, maxWords] = targetWords(originalWords)
  const category = archive.categories.find((entry) => entry.slug === post.categories[0])
  const inventory = linkInventory(archive, post, locale)
  const language = locale === 'ar' ? 'Arabic' : 'English'

  const instruction = `Rewrite this ${language} article from the HiGreenPanda blog as a complete, authoritative guide of ${minWords} to ${maxWords} words. Same language as the original. Category: ${category?.[locale] ?? ''}.

Keep every fact, figure and recommendation the original makes; correct nothing silently, but you may add context and practical detail a Gulf importer needs. Do not pad: every paragraph must tell the reader something they can act on.

Required structure:
- An opening paragraph (two to four sentences) that states the reader's problem and what they will know by the end. The focus keyword appears in it naturally.
- Five to eight H2 sections, several with H3 subsections. At least one numbered step-by-step list and at least one checklist (bulleted). Figures with ranges and units where a figure is relevant (days, USD, CNY, %, container sizes, MOQ). One section on the mistakes people make.
- A closing section "what to do next" (in ${language}) that says what the reader should do this week. One sentence at most may mention that HiGreenPanda does this on the ground, with a link to the relevant service page.
- Internal links: place 4 to 7 links from the inventory below, only where the linked page genuinely helps at that point, using the exact syntax [anchor text](url). Use each URL at most once. Never invent a URL. At least two links must be to other articles and at least one to a service page.
- Inline markup allowed: [anchor](url) for links and **bold** for a key phrase. Nothing else — no HTML, no markdown headings inside text.
- Title: a rewritten title of 45 to 70 characters containing the focus keyword (may be close to the original title).
- Focus keyword: the search phrase this article should rank for, in ${language}, as people type it.
- Meta description: 120 to 158 characters, contains the focus keyword, promises what the reader gets.
- Excerpt: one or two sentences, 120 to 260 characters.
- Key takeaways: 3 to 5 sentences a reader could act on without reading further.
- Questions: 3 to 6 questions people actually type into search about this subject, each answered directly in 2 to 4 sentences, drawn from the article.

Link inventory (the only URLs you may use):
${inventory}

Original title: ${doc.title}
Original excerpt: ${doc.excerpt}

Original article:
${original.slice(0, 60_000)}`

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: { format: zodOutputFormat(articleSchema), effort: 'high' },
    system: VOICE,
    messages: [{ role: 'user', content: instruction }],
  })
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    console.warn(`[rewrite] no usable answer for ${post.slug} (${locale}): ${response.stop_reason}`)
    return null
  }
  const draft = response.parsed_output

  // Every link must come from the inventory; drop the rare invented one by
  // turning it back into plain text rather than shipping a 404.
  const allowed = new Set(inventory.match(/^- (\S+)/gm)?.map((line) => line.slice(2)) ?? [])
  const bad = blocksLinks(draft.body).filter((href) => !allowed.has(href))
  if (bad.length) {
    console.warn(
      `[rewrite] ${post.slug} (${locale}): removing ${bad.length} link(s) not in inventory`,
    )
    for (const block of draft.body) {
      const strip = (text: string) =>
        text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, href) =>
          allowed.has(href) ? whole : label,
        )
      if ('items' in block) block.items = block.items.map(strip)
      else block.text = strip(block.text)
    }
  }
  return draft
}

export function applyDraft(post: ArchivePost, locale: Locale, draft: ArticleDraft): void {
  // A missing language is a new translation: start from an empty version.
  const doc: LocaleDoc = post.locales[locale] ?? {
    legacyId: '',
    title: '',
    excerpt: '',
    seoDescription: '',
    focusKeyword: null,
    body: { root: {} },
    wordCount: 0,
  }
  const words = blocksWordCount(draft.body)
  post.locales[locale] = {
    ...doc,
    title: draft.title,
    excerpt: draft.excerpt,
    seoDescription: draft.seoDescription,
    focusKeyword: draft.focusKeyword,
    body: blocksToLexical(draft.body) as LocaleDoc['body'],
    keyTakeaways: draft.keyTakeaways,
    faqs: draft.faqs,
    originalWordCount: doc.originalWordCount ?? doc.wordCount,
    wordCount: words,
    rewrittenAt: new Date().toISOString(),
    rewriteModel: MODEL,
  }
  // A video-only draft that now has a real article can be published.
  if (post.status === 'draft' && words >= 300) post.status = 'published'
}

/**
 * Rewrite up to `limit` (article, locale) pairs, `concurrency` at a time,
 * saving after each. `only` restricts to one slug. Returns how many were done.
 */
export async function rewriteArchive(options: {
  limit?: number
  concurrency?: number
  only?: string
  force?: boolean
}): Promise<number> {
  const archive = loadArchive()
  const queue: Array<{ post: ArchivePost; locale: Locale }> = []
  for (const post of archive.posts) {
    if (options.only && post.slug !== options.only) continue
    for (const locale of ['ar', 'en'] as const) {
      const doc = post.locales[locale]
      if (!doc) continue
      if (doc.rewrittenAt && !options.force) continue
      queue.push({ post, locale })
    }
  }
  const todo = queue.slice(0, options.limit ?? queue.length)
  console.log(
    `[rewrite] ${todo.length} of ${queue.length} pending article versions, model ${MODEL}`,
  )
  let done = 0
  let index = 0
  const workers = Array.from({ length: Math.max(1, options.concurrency ?? 3) }, async () => {
    while (index < todo.length) {
      const item = todo[index++]
      if (!item) break
      const label = `${item.post.slug} (${item.locale})`
      try {
        const started = Date.now()
        const draft = await rewriteOne(archive, item.post, item.locale)
        if (!draft) continue
        const before = item.post.locales[item.locale]!.wordCount
        applyDraft(item.post, item.locale, draft)
        saveArchive(archive)
        done++
        console.log(
          `[rewrite] ${done}/${todo.length} ${label}: ${before} → ${item.post.locales[item.locale]!.wordCount} words, ${blocksLinks(draft.body).length} links, ${draft.faqs.length} questions (${Math.round((Date.now() - started) / 1000)}s)`,
        )
      } catch (error) {
        console.error(`[rewrite] ${label} failed: ${(error as Error).message}`)
      }
    }
  })
  await Promise.all(workers)
  return done
}

/** Every (article, language) pair still waiting for a rewrite. */
export function pendingItems(
  archive: Archive,
  force = false,
): Array<{ post: ArchivePost; locale: Locale }> {
  const queue: Array<{ post: ArchivePost; locale: Locale }> = []
  for (const post of archive.posts) {
    for (const locale of ['ar', 'en'] as const) {
      const doc = post.locales[locale]
      if (!doc) continue
      if (doc.rewrittenAt && !force) continue
      queue.push({ post, locale })
    }
  }
  return queue
}

/** The brief a writer (person or model) needs to rewrite one article version. */
export function sourcePack(archive: Archive, post: ArchivePost, locale: Locale): string {
  const doc = post.locales[locale]!
  const original = lexicalToPlainText(doc.body)
  const originalWords = original.split(/\s+/).filter(Boolean).length
  const [minWords, maxWords] = targetWords(originalWords)
  const category = archive.categories.find((entry) => entry.slug === post.categories[0])
  return [
    `# ${post.slug} (${locale})`,
    '',
    `- language: ${locale === 'ar' ? 'Arabic' : 'English'}`,
    `- category: ${category?.[locale] ?? ''} (${post.categories.join(', ')})`,
    `- original words: ${originalWords}`,
    `- target words: ${minWords} to ${maxWords}`,
    `- published: ${post.publishedAt.slice(0, 10)}`,
    '',
    '## Link inventory (the only URLs allowed)',
    linkInventory(archive, post, locale),
    '',
    `## Original title`,
    doc.title,
    '',
    '## Original excerpt',
    doc.excerpt,
    '',
    '## Original article',
    original,
    '',
  ].join('\n')
}

/** Brief for translating an Arabic article into English (the version is missing today). */
export function translationPack(archive: Archive, post: ArchivePost): string {
  const ar = post.locales.ar!
  const category = archive.categories.find((entry) => entry.slug === post.categories[0])
  const words = lexicalToPlainText(ar.body).split(/\s+/).filter(Boolean).length
  return [
    `# ${post.slug} (en) — TRANSLATION`,
    '',
    '- language: English (write the English version of the Arabic article below)',
    `- category: ${category?.en ?? ''} (${post.categories.join(', ')})`,
    `- target words: ${Math.max(1300, Math.round(words * 0.9))} to ${Math.max(1900, Math.round(words * 1.3))}`,
    '',
    '## Link inventory (the only URLs allowed)',
    linkInventory(archive, post, 'en'),
    '',
    '## Arabic title',
    ar.title,
    '',
    '## Arabic focus keyword',
    ar.focusKeyword ?? '',
    '',
    '## Arabic key takeaways',
    ...(ar.keyTakeaways ?? []).map((item) => `- ${item}`),
    '',
    '## Arabic questions',
    ...(ar.faqs ?? []).map((item) => `Q: ${item.question}\nA: ${item.answer}`),
    '',
    '## Arabic article',
    lexicalToPlainText(ar.body),
    '',
  ].join('\n')
}
