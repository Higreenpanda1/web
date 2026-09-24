import { z } from 'zod/v4'

/**
 * The article shape every Claude content job produces, and the conversion to
 * a Lexical document the CMS can open.
 *
 * Text inside a paragraph or list item may carry two kinds of inline markup,
 * and nothing else:
 *   [anchor text](/blog/some-slug)   an internal link (site-relative path)
 *   **bold**                         emphasis
 * The model is told exactly that; anything else is kept as literal text. Links
 * become Lexical link nodes with `linkType: custom`, which is what the editor
 * shows as an ordinary link and what the renderer turns into <a>.
 */

export const articleSchema = z.object({
  title: z.string().min(10).max(120),
  excerpt: z.string().min(60).max(280),
  seoDescription: z.string().min(80).max(158),
  focusKeyword: z.string().min(3).max(120),
  body: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('h2'), text: z.string().min(3) }),
        z.object({ type: z.literal('h3'), text: z.string().min(3) }),
        z.object({ type: z.literal('p'), text: z.string().min(1) }),
        z.object({ type: z.literal('ul'), items: z.array(z.string().min(1)).min(1) }),
        z.object({ type: z.literal('ol'), items: z.array(z.string().min(1)).min(1) }),
      ]),
    )
    .min(6),
  keyTakeaways: z.array(z.string().min(20).max(220)).min(3).max(5),
  faqs: z
    .array(
      z.object({
        question: z.string().min(10).max(200),
        answer: z.string().min(60).max(700),
      }),
    )
    .min(3)
    .max(6),
})

export type ArticleDraft = z.infer<typeof articleSchema>
export type ArticleBlock = ArticleDraft['body'][number]

const BASE = { format: '', indent: 0, version: 1, direction: null as null }

function textNode(value: string, format = 0) {
  return { type: 'text', detail: 0, format, mode: 'normal', style: '', text: value, version: 1 }
}

/** Inline markup → Lexical text and link nodes. */
export function inlineToLexical(source: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = []
  // Links first, then bold inside the plain runs.
  const linkRe = /\[([^\]]+)\]\(((?:\/|https?:\/\/)[^)\s]+)\)/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = linkRe.exec(source)) !== null) {
    if (match.index > last) out.push(...boldRuns(source.slice(last, match.index)))
    const label = match[1] ?? ''
    const href = match[2] ?? ''
    out.push({
      ...BASE,
      type: 'link',
      version: 3,
      fields: { linkType: 'custom', url: href, newTab: href.startsWith('http') },
      children: boldRuns(label),
    })
    last = match.index + match[0].length
  }
  if (last < source.length) out.push(...boldRuns(source.slice(last)))
  return out.length ? out : [textNode('')]
}

function boldRuns(source: string): Array<Record<string, unknown>> {
  const parts = source.split(/(\*\*[^*]+\*\*)/g).filter((part) => part.length > 0)
  return parts.map((part) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? textNode(part.slice(2, -2), 1)
      : textNode(part),
  )
}

/** The model's block list as a Lexical document the editor can open. */
export function blocksToLexical(blocks: ArticleBlock[]) {
  const children = blocks.map((block) => {
    switch (block.type) {
      case 'h2':
      case 'h3':
        return { ...BASE, type: 'heading', tag: block.type, children: inlineToLexical(block.text) }
      case 'ul':
      case 'ol':
        return {
          ...BASE,
          type: 'list',
          listType: block.type === 'ol' ? 'number' : 'bullet',
          tag: block.type,
          start: 1,
          children: block.items.map((item, index) => ({
            ...BASE,
            type: 'listitem',
            value: index + 1,
            children: inlineToLexical(item),
          })),
        }
      default:
        return { ...BASE, type: 'paragraph', textFormat: 0, children: inlineToLexical(block.text) }
    }
  })
  return { root: { ...BASE, type: 'root', children } }
}

/** Word count of a block list, links and bold markup ignored. */
export function blocksWordCount(blocks: ArticleBlock[]): number {
  const text = blocks
    .map((block) => ('items' in block ? block.items.join(' ') : block.text))
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*/g, '')
  return text.split(/\s+/).filter(Boolean).length
}

/** Every internal link target in a block list, for checking against the inventory. */
export function blocksLinks(blocks: ArticleBlock[]): string[] {
  const text = blocks
    .map((block) => ('items' in block ? block.items.join('\n') : block.text))
    .join('\n')
  return Array.from(text.matchAll(/\]\(([^)\s]+)\)/g), (match) => match[1] ?? '')
}
