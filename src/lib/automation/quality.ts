import { tokens } from './research/similarity.ts'
import { blocksLinks, blocksWordCount, type ArticleBlock, type ArticleDraft } from './blocks.ts'

/**
 * The gate a machine-written article passes before it may go live on its own.
 * It checks what a careful editor checks first — length, the search phrase
 * where it must be, the pieces answer engines lift out, links that exist, the
 * house rules on tone — and reports every failure by name, so a draft that
 * fails is saved for a person with the reasons attached rather than thrown
 * away.
 *
 * It cannot check facts. That is why autopublishing is a switch the owner
 * turns on, and why every article cites its sources.
 */

export type QualityReport = {
  ok: boolean
  issues: string[]
  words: number
  links: number
}

export type QualityOptions = {
  locale: 'ar' | 'en'
  keyword: string
  /** Site-relative paths the article may link to. Links outside it are removed before checking. */
  allowedLinks: Set<string>
  minWords?: number
  minLinks?: number
  /** A path the article must link to (the service it sells). */
  mustLink?: string | null
}

const BANNED: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bcheap(er|est)?\b/i, label: 'uses "cheap"' },
  { pattern: /رخيص/, label: 'uses "رخيص"' },
  { pattern: /!/, label: 'contains an exclamation mark' },
  { pattern: /\p{Extended_Pictographic}/u, label: 'contains an emoji' },
  { pattern: /\bguarantee(d|s)?\b/i, label: 'promises a guarantee' },
  { pattern: /نضمن لك|ضمان كامل/, label: 'promises a guarantee' },
]

export function checkDraft(draft: ArticleDraft, options: QualityOptions): QualityReport {
  const issues: string[] = []
  const minWords = options.minWords ?? 900
  const words = blocksWordCount(draft.body)
  if (words < minWords) issues.push(`only ${words} words (minimum ${minWords})`)

  const firstParagraph = draft.body.find((block) => block.type === 'p')
  const lead = `${draft.title} ${firstParagraph && 'text' in firstParagraph ? firstParagraph.text : ''}`
  if (!containsPhrase(lead, options.keyword)) {
    issues.push(`the search phrase "${options.keyword}" is not in the title or the first paragraph`)
  }
  if (!draft.body.some((block) => block.type === 'h2')) issues.push('no H2 headings')
  if (draft.body.filter((block) => block.type === 'h2').length < 3)
    issues.push('fewer than 3 sections')
  if (!draft.body.some((block) => block.type === 'ol' || block.type === 'ul'))
    issues.push('no list')
  if (draft.keyTakeaways.length < 3) issues.push('fewer than 3 key takeaways')
  if (draft.faqs.length < 3) issues.push('fewer than 3 questions')
  if (draft.seoDescription.length > 158) issues.push('meta description over 158 characters')
  if (!containsPhrase(draft.seoDescription, options.keyword)) {
    issues.push('the search phrase is not in the meta description')
  }

  const text = allText(draft)
  for (const rule of BANNED) if (rule.pattern.test(text)) issues.push(rule.label)

  const links = blocksLinks(draft.body)
  const outside = links.filter((link) => !options.allowedLinks.has(link))
  if (outside.length) issues.push(`links outside the inventory: ${outside.join(', ')}`)
  const inside = links.filter((link) => options.allowedLinks.has(link))
  const minLinks = options.minLinks ?? 2
  if (new Set(inside).size < minLinks)
    issues.push(`only ${new Set(inside).size} internal link(s) (minimum ${minLinks})`)
  if (options.mustLink && !inside.includes(options.mustLink)) {
    issues.push(`does not link to ${options.mustLink}`)
  }

  const expected = options.locale === 'ar' ? /[؀-ۿ]/ : /[A-Za-z]/
  const other = options.locale === 'ar' ? /[A-Za-z]{4,}/g : /[؀-ۿ]{3,}/g
  if (!expected.test(draft.title))
    issues.push(`title is not in ${options.locale === 'ar' ? 'Arabic' : 'English'}`)
  const foreign = (text.match(other) ?? []).length
  const total = text.split(/\s+/).length
  if (options.locale === 'ar' && foreign > total * 0.2)
    issues.push('too much Latin text for an Arabic article')
  if (options.locale === 'en' && foreign > total * 0.05)
    issues.push('Arabic text inside the English article')

  return { ok: issues.length === 0, issues, words, links: new Set(inside).size }
}

/** True when most of the phrase's content words occur in the text (order-free, normalised). */
export function containsPhrase(text: string, phrase: string): boolean {
  const wanted = tokens(phrase)
  if (wanted.size === 0) return true
  const have = tokens(text)
  let found = 0
  for (const token of wanted)
    if (have.has(token) || Array.from(have).some((t) => t.includes(token) || token.includes(t)))
      found++
  return found / wanted.size >= 0.6
}

/** Remove links that point outside the inventory, keeping their text. */
export function stripLinks(
  blocks: ArticleBlock[],
  allowed: Set<string>,
): { blocks: ArticleBlock[]; removed: string[] } {
  const removed: string[] = []
  const fix = (value: string) =>
    value.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, url: string) => {
      if (allowed.has(url)) return whole
      removed.push(url)
      return label
    })
  const out = blocks.map((block) =>
    'items' in block
      ? { ...block, items: block.items.map(fix) }
      : { ...block, text: fix(block.text) },
  ) as ArticleBlock[]
  return { blocks: out, removed }
}

function allText(draft: ArticleDraft): string {
  return [
    draft.title,
    draft.excerpt,
    draft.seoDescription,
    ...draft.body.map((block) => ('items' in block ? block.items.join('\n') : block.text)),
    ...draft.keyTakeaways,
    ...draft.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join('\n')
}
