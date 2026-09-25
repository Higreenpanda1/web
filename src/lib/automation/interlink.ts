import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import { inlineToLexical, toMarkup, type MarkupNode } from './blocks'
import { loadArchive, saveArchive, type Archive, type ArchivePost, type Locale } from './rewrite'

/**
 * Internal linking for the archive: give every article at least a few links
 * from other articles' bodies.
 *
 * An "orphan" is an article version that no other article (same language)
 * links to from its body. Category pages, related-article blocks and
 * older/newer navigation still reach it, but a contextual link from a
 * related article is what tells a search engine the page matters and what
 * it is about.
 *
 *   npm run posts:links-packs   → <dir>/packs/<slug>.<locale>.md
 *       the orphan's title, keyword and summary, and 4 candidate source
 *       articles with their paragraphs numbered, as editable markup
 *   (write)                     → <dir>/out/<slug>.<locale>.json
 *       { "edits": [{ "source": "<slug>", "block": <n>, "text": "<paragraph with the link>" }] }
 *   npm run posts:links-apply   → validates each edit and applies it to src/seed/wp/posts.json
 *
 * Validation: the source is a candidate from the pack, the block is a
 * paragraph, the new text links the orphan exactly once, keeps every link the
 * paragraph already had, keeps the original wording (word-sequence
 * similarity), and adds at most a short clause.
 */

type Node = MarkupNode

const MAX_ADDED_WORDS = 30
const MIN_SIMILARITY = 0.8
const CANDIDATES = 4
const MAX_OUTGOING = 10

function prefix(locale: Locale): string {
  return locale === 'en' ? '/en' : ''
}

function urlOf(post: ArchivePost, locale: Locale): string {
  return `${prefix(locale)}/blog/${post.slug}`
}

function blocksOf(post: ArchivePost, locale: Locale): Node[] {
  return ((post.locales[locale]?.body.root as Node | undefined)?.children ?? []) as Node[]
}

function linksIn(node: Node, out: string[] = []): string[] {
  if (node.type === 'link' && node.fields?.url) out.push(node.fields.url)
  for (const child of node.children ?? []) linksIn(child, out)
  return out
}

function plain(markup: string): string {
  return markup.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '')
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** Longest-common-subsequence ratio of two word lists, relative to the original. */
function keptRatio(original: string[], edited: string[]): number {
  if (original.length === 0) return 1
  const dp = new Array(edited.length + 1).fill(0)
  for (let i = 1; i <= original.length; i++) {
    let prev = 0
    for (let j = 1; j <= edited.length; j++) {
      const temp = dp[j]
      dp[j] = original[i - 1] === edited[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1])
      prev = temp
    }
  }
  return dp[edited.length] / original.length
}

/** Inbound body links per URL, per language. */
export function inboundCounts(archive: Archive): Map<string, number> {
  const counts = new Map<string, number>()
  for (const post of archive.posts) {
    for (const locale of ['ar', 'en'] as const) {
      if (!post.locales[locale]) continue
      const self = urlOf(post, locale)
      for (const block of blocksOf(post, locale)) {
        for (const url of linksIn(block)) {
          if (url === self) continue
          counts.set(url, (counts.get(url) ?? 0) + 1)
        }
      }
    }
  }
  return counts
}

export function orphans(
  archive: Archive,
  minInbound = 1,
): Array<{ post: ArchivePost; locale: Locale }> {
  const inbound = inboundCounts(archive)
  const out: Array<{ post: ArchivePost; locale: Locale }> = []
  for (const post of archive.posts) {
    if (post.status !== 'published') continue
    for (const locale of ['ar', 'en'] as const) {
      if (!post.locales[locale]) continue
      if ((inbound.get(urlOf(post, locale)) ?? 0) < minInbound) out.push({ post, locale })
    }
  }
  return out
}

/** Related articles in the same language that could link to this one. */
function candidates(archive: Archive, target: ArchivePost, locale: Locale): ArchivePost[] {
  const targetUrl = urlOf(target, locale)
  return archive.posts
    .filter(
      (other) =>
        other.slug !== target.slug && other.status === 'published' && other.locales[locale],
    )
    .map((other) => {
      const outgoing = blocksOf(other, locale).flatMap((block) => linksIn(block))
      return {
        other,
        shared: other.categories.filter((category) => target.categories.includes(category)).length,
        outgoing: outgoing.length,
        already: outgoing.includes(targetUrl),
      }
    })
    .filter((entry) => !entry.already && entry.outgoing < MAX_OUTGOING)
    .sort((a, b) => b.shared - a.shared || a.outgoing - b.outgoing)
    .slice(0, CANDIDATES)
    .map((entry) => entry.other)
}

export function writeLinkPacks(dir: string): number {
  const archive = loadArchive()
  mkdirSync(path.join(dir, 'packs'), { recursive: true })
  mkdirSync(path.join(dir, 'out'), { recursive: true })
  let count = 0
  for (const { post, locale } of orphans(archive)) {
    const doc = post.locales[locale]!
    const lines = [
      `# Link target: ${urlOf(post, locale)}`,
      '',
      `- language: ${locale === 'ar' ? 'Arabic' : 'English'}`,
      `- title: ${doc.title}`,
      `- focus keyword: ${doc.focusKeyword ?? ''}`,
      `- summary: ${doc.excerpt}`,
      '',
      'Add a link to the URL above in 2 or 3 of the candidate articles below (one paragraph per article).',
      '',
    ]
    for (const source of candidates(archive, post, locale)) {
      lines.push(`## Candidate: ${source.slug}`, `Title: ${source.locales[locale]!.title}`, '')
      blocksOf(source, locale).forEach((block, index) => {
        if (block.type !== 'paragraph') return
        const markup = toMarkup(block)
        if (words(plain(markup)).length < 20) return
        lines.push(`[${index}] ${markup}`, '')
      })
    }
    writeFileSync(path.join(dir, 'packs', `${post.slug}.${locale}.md`), lines.join('\n'))
    count++
  }
  return count
}

export function applyLinkEdits(dir: string): { applied: number; rejected: string[] } {
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
    const target = match ? archive.posts.find((post) => post.slug === match[1]) : undefined
    const locale = match?.[2] as Locale | undefined
    if (!match || !target || !locale || !target.locales[locale]) {
      rejected.push(`${file}: unknown link target`)
      continue
    }
    const targetUrl = urlOf(target, locale)
    let edits: Array<{ source: string; block: number; text: string }>
    try {
      edits = (JSON.parse(readFileSync(path.join(out, file), 'utf8')) as { edits: typeof edits })
        .edits
      if (!Array.isArray(edits)) throw new Error('no edits array')
    } catch (error) {
      rejected.push(`${file}: ${(error as Error).message}`)
      continue
    }
    let good = 0
    for (const edit of edits) {
      const label = `${file} → ${edit.source}[${edit.block}]`
      const source = archive.posts.find((post) => post.slug === edit.source)
      if (
        !source ||
        source.slug === target.slug ||
        source.status !== 'published' ||
        !source.locales[locale]
      ) {
        rejected.push(`${label}: not a published article in this language`)
        continue
      }
      const blocks = blocksOf(source, locale)
      const block = blocks[edit.block]
      if (!block || block.type !== 'paragraph') {
        rejected.push(`${label}: block is not a paragraph`)
        continue
      }
      const before = toMarkup(block)
      const after = String(edit.text ?? '')
      const newLinks = Array.from(after.matchAll(/\]\(([^)\s]+)\)/g), (m) => m[1])
      const oldLinks = linksIn(block)
      if (newLinks.filter((url) => url === targetUrl).length !== 1) {
        rejected.push(`${label}: must link ${targetUrl} exactly once`)
        continue
      }
      if (oldLinks.some((url) => !newLinks.includes(url))) {
        rejected.push(`${label}: dropped an existing link`)
        continue
      }
      if (newLinks.length !== oldLinks.length + 1) {
        rejected.push(`${label}: added links other than the target`)
        continue
      }
      const beforeWords = words(plain(before))
      const afterWords = words(plain(after))
      if (keptRatio(beforeWords, afterWords) < MIN_SIMILARITY) {
        rejected.push(`${label}: rewrote the paragraph instead of inserting a link`)
        continue
      }
      if (afterWords.length - beforeWords.length > MAX_ADDED_WORDS) {
        rejected.push(`${label}: added ${afterWords.length - beforeWords.length} words`)
        continue
      }
      block.children = inlineToLexical(after) as Node[]
      good++
    }
    if (good > 0) {
      saveArchive(archive)
      renameSync(path.join(out, file), path.join(done, file))
      applied += good
    }
  }
  return { applied, rejected }
}
