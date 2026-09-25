import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import { SERVICES } from '@/seed/content'

import { articleSchema, blocksLinks, blocksWordCount } from './blocks'
import {
  applyDraft,
  linkInventory,
  loadArchive,
  pendingItems,
  saveArchive,
  sourcePack,
  translationPack,
} from './rewrite'

/**
 * The file-based half of the archive rewrite, for when the writing is done by
 * a person or by an agent in an editor session rather than through the API.
 *
 *   npm run posts:rewrite-packs   → <dir>/packs/<slug>.<locale>.md   one brief per pending version
 *   (write)                       → <dir>/out/<slug>.<locale>.json   an article in the schema
 *   npm run posts:rewrite-apply   → validates each JSON, applies it to src/seed/wp/posts.json,
 *                                   moves it to <dir>/applied/, and lists what it rejected and why
 *
 * The same checks the API job makes: schema, word count, every link in the
 * inventory, and (for Arabic) that the text is actually Arabic.
 */

export function writePacks(dir: string): number {
  const archive = loadArchive()
  const packs = path.join(dir, 'packs')
  mkdirSync(packs, { recursive: true })
  mkdirSync(path.join(dir, 'out'), { recursive: true })
  let count = 0
  for (const { post, locale } of pendingItems(archive)) {
    writeFileSync(path.join(packs, `${post.slug}.${locale}.md`), sourcePack(archive, post, locale))
    count++
  }
  writeFileSync(
    path.join(dir, 'FORMAT.md'),
    `# Output format

One JSON file per pack, at out/<slug>.<locale>.json, exactly this shape:

{
  "title": "45–70 characters, contains the focus keyword",
  "excerpt": "120–260 characters, one or two sentences",
  "seoDescription": "120–158 characters, contains the focus keyword",
  "focusKeyword": "the search phrase, as people type it",
  "body": [
    { "type": "p", "text": "Opening paragraph…" },
    { "type": "h2", "text": "Section heading" },
    { "type": "h3", "text": "Subsection" },
    { "type": "ol", "items": ["step one", "step two"] },
    { "type": "ul", "items": ["check this", "check that"] }
  ],
  "keyTakeaways": ["3 to 5 actionable sentences"],
  "faqs": [{ "question": "…?", "answer": "2–4 sentences" }]
}

Inline markup inside text and items: [anchor](url) for a link (only URLs from the pack's inventory,
each at most once, 4 to 7 per article, at least two to articles and one to a service page) and
**bold**. Nothing else. No HTML. Same language as the pack. Word target as stated in the pack.
`,
  )
  return count
}

export function applyRewrites(dir: string): { applied: number; rejected: string[] } {
  const archive = loadArchive()
  const out = path.join(dir, 'out')
  const done = path.join(dir, 'applied')
  mkdirSync(done, { recursive: true })
  if (!existsSync(out)) return { applied: 0, rejected: [] }
  const rejected: string[] = []
  let applied = 0

  for (const file of readdirSync(out)
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    const match = /^(.+)\.(ar|en)\.json$/.exec(file)
    if (!match) {
      rejected.push(`${file}: name must be <slug>.<ar|en>.json`)
      continue
    }
    const slug = match[1] ?? ''
    const locale = match[2] as 'ar' | 'en'
    const post = archive.posts.find((entry) => entry.slug === slug)
    // A new English version of an Arabic-only article is a translation.
    const isTranslation = Boolean(
      post && !post.locales[locale] && locale === 'en' && post.locales.ar,
    )
    if (!post || (!post.locales[locale] && !isTranslation)) {
      rejected.push(`${file}: no such article version`)
      continue
    }
    let parsed
    try {
      parsed = articleSchema.safeParse(JSON.parse(readFileSync(path.join(out, file), 'utf8')))
    } catch (error) {
      rejected.push(`${file}: invalid JSON (${(error as Error).message})`)
      continue
    }
    if (!parsed.success) {
      rejected.push(
        `${file}: ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .slice(0, 3)
          .join('; ')}`,
      )
      continue
    }
    const draft = parsed.data
    const problems: string[] = []
    const words = blocksWordCount(draft.body)
    if (words < 1000) problems.push(`only ${words} words`)
    // A link is acceptable if it points at a page that exists in this
    // language: anything in the inventory, any other published article, any
    // service page. The inventory is a suggestion to the writer, not a fence.
    const prefix = locale === 'en' ? '/en' : ''
    const allowed = new Set([
      ...(linkInventory(archive, post, locale)
        .match(/^- (\S+)/gm)
        ?.map((line) => line.slice(2)) ?? []),
      ...archive.posts
        .filter(
          (other) =>
            other.slug !== post.slug && other.status === 'published' && other.locales[locale],
        )
        .map((other) => `${prefix}/blog/${other.slug}`),
      ...SERVICES.map((service) => `${prefix}/services/${service.slug}`),
    ])
    const links = blocksLinks(draft.body)
    const bad = links.filter((href) => !allowed.has(href))
    if (bad.length) problems.push(`links not in inventory: ${bad.join(', ')}`)
    if (links.length < 3) problems.push(`only ${links.length} internal links`)
    if (!draft.body.some((b) => b.type === 'h2')) problems.push('no H2 headings')
    const text = draft.body.map((b) => ('items' in b ? b.items.join(' ') : b.text)).join(' ')
    const arabicRatio =
      (text.match(/[؀-ۿ]/g)?.length ?? 0) / Math.max(1, text.replace(/\s/g, '').length)
    if (locale === 'ar' && arabicRatio < 0.5) problems.push('body is not Arabic')
    if (locale === 'en' && arabicRatio > 0.2) problems.push('body is not English')
    if (problems.length) {
      rejected.push(`${file}: ${problems.join('; ')}`)
      continue
    }
    applyDraft(post, locale, draft)
    renameSync(path.join(out, file), path.join(done, file))
    applied++
  }
  if (applied) saveArchive(archive)
  return { applied, rejected }
}

/** One translation brief per Arabic-only article, into the same packs/out layout. */
export function writeTranslationPacks(dir: string): number {
  const archive = loadArchive()
  mkdirSync(path.join(dir, 'packs'), { recursive: true })
  mkdirSync(path.join(dir, 'out'), { recursive: true })
  let count = 0
  for (const post of archive.posts) {
    if (post.status !== 'published' || !post.locales.ar || post.locales.en) continue
    writeFileSync(path.join(dir, 'packs', `${post.slug}.en.md`), translationPack(archive, post))
    count++
  }
  return count
}
