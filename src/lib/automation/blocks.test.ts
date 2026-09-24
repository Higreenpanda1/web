import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { blocksLinks, blocksToLexical, blocksWordCount, inlineToLexical } from './blocks.ts'

describe('inlineToLexical', () => {
  it('turns markdown links into Lexical link nodes and keeps the rest as text', () => {
    const nodes = inlineToLexical('See [the guide](/blog/x) and **this** now.')
    assert.deepEqual(
      nodes.map((n) => n.type),
      ['text', 'link', 'text', 'text', 'text'],
    )
    const link = nodes[1] as { fields: { url: string }; children: Array<{ text: string }> }
    assert.equal(link.fields.url, '/blog/x')
    assert.equal(link.children[0].text, 'the guide')
    assert.equal((nodes[3] as { format: number }).format, 1)
  })
  it('leaves text without markup untouched', () => {
    const nodes = inlineToLexical('كيف تختار المورد')
    assert.equal(nodes.length, 1)
    assert.equal((nodes[0] as { text: string }).text, 'كيف تختار المورد')
  })
})

describe('blocksToLexical', () => {
  it('builds headings, paragraphs and lists', () => {
    const doc = blocksToLexical([
      { type: 'h2', text: 'Step one' },
      { type: 'p', text: 'Read [this](/en/blog/a).' },
      { type: 'ol', items: ['first', 'second **now**'] },
    ])
    const kids = doc.root.children as Array<{ type: string; tag?: string; children: unknown[] }>
    assert.deepEqual(
      kids.map((k) => [k.type, k.tag]),
      [
        ['heading', 'h2'],
        ['paragraph', undefined],
        ['list', 'ol'],
      ],
    )
    assert.equal(kids[2].children.length, 2)
  })
})

describe('helpers', () => {
  it('counts words without markup and lists link targets', () => {
    const blocks = [
      { type: 'p' as const, text: 'One [two](/a) **three**' },
      { type: 'ul' as const, items: ['four [five](/b)'] },
    ]
    assert.equal(blocksWordCount(blocks), 5)
    assert.deepEqual(blocksLinks(blocks), ['/a', '/b'])
  })
})
