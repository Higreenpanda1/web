/**
 * Read-only helpers over a stored Lexical document: the plain text (for feeds,
 * llms.txt, word counts and the AI jobs), the headings (for the table of
 * contents) and the anchor id a heading renders with. The renderer and the
 * table of contents both call `anchorId`, which is what keeps a click in the
 * contents landing on the right heading.
 */

type LexicalNode = {
  type?: string
  tag?: string
  text?: string
  children?: LexicalNode[]
  root?: LexicalNode
  [key: string]: unknown
}

export type Heading = { id: string; text: string; level: 2 | 3 }

export function nodeText(node: LexicalNode | undefined | null): string {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  if (node.type === 'linebreak') return ' '
  return (node.children ?? []).map(nodeText).join('')
}

/** Paragraph-separated plain text of a whole document. */
export function lexicalToPlainText(data: unknown): string {
  const root = (data as { root?: LexicalNode } | null)?.root
  if (!root) return ''
  const out: string[] = []
  const walk = (node: LexicalNode) => {
    switch (node.type) {
      case 'heading':
      case 'paragraph':
      case 'quote': {
        const text = nodeText(node).replace(/\s+/g, ' ').trim()
        if (text) out.push(node.type === 'heading' ? `\n${text}\n` : text)
        return
      }
      case 'listitem': {
        const own = (node.children ?? []).filter((child) => child.type !== 'list')
        const text = own.map(nodeText).join('').replace(/\s+/g, ' ').trim()
        if (text) out.push(`- ${text}`)
        for (const child of node.children ?? []) if (child.type === 'list') walk(child)
        return
      }
      case 'horizontalrule':
      case 'upload':
        return
      default:
        for (const child of node.children ?? []) walk(child)
    }
  }
  walk(root)
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** H2 and H3 headings, in order, with the ids the renderer gives them. */
export function extractHeadings(data: unknown): Heading[] {
  const root = (data as { root?: LexicalNode } | null)?.root
  if (!root) return []
  const seen = new Map<string, number>()
  const headings: Heading[] = []
  for (const node of root.children ?? []) {
    if (node.type !== 'heading' || (node.tag !== 'h2' && node.tag !== 'h3')) continue
    const text = nodeText(node).replace(/\s+/g, ' ').trim()
    if (!text) continue
    headings.push({ id: uniqueAnchor(text, seen), text, level: node.tag === 'h2' ? 2 : 3 })
  }
  return headings
}

/**
 * A stable fragment identifier for a heading. Arabic letters are valid in an
 * HTML id and in a URL fragment, so they are kept rather than transliterated —
 * a reader sharing a link to a section sees the section's own words in it.
 */
export function anchorId(text: string): string {
  const cleaned = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, '') // Arabic short vowels and marks
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return cleaned || 'section'
}

export function uniqueAnchor(text: string, seen: Map<string, number>): string {
  const base = anchorId(text)
  const count = seen.get(base) ?? 0
  seen.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}

export function wordCount(data: unknown): number {
  const text = lexicalToPlainText(data)
  return text ? text.split(/\s+/).filter(Boolean).length : 0
}
