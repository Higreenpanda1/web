import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { anchorId, extractHeadings, lexicalToPlainText, uniqueAnchor } from './lexical.ts'

const text = (value: string) => ({ type: 'text', text: value, version: 1 })
const doc = {
  root: {
    type: 'root',
    children: [
      { type: 'paragraph', children: [text('Opening line.')] },
      { type: 'heading', tag: 'h2', children: [text('كيف تختار المورد؟')] },
      { type: 'paragraph', children: [text('Body one.')] },
      { type: 'heading', tag: 'h3', children: [text('Step one: ask for the licence')] },
      {
        type: 'list',
        children: [
          { type: 'listitem', children: [text('First')] },
          { type: 'listitem', children: [text('Second')] },
        ],
      },
      { type: 'heading', tag: 'h2', children: [text('كيف تختار المورد؟')] },
      { type: 'heading', tag: 'h4', children: [text('Not in the contents')] },
    ],
  },
}

describe('anchorId', () => {
  it('keeps Arabic letters and strips punctuation', () => {
    assert.equal(anchorId('كيف تختار المورد؟'), 'كيف-تختار-المورد')
  })
  it('lowercases Latin and collapses separators', () => {
    assert.equal(anchorId('Step one:  ask for the licence'), 'step-one-ask-for-the-licence')
  })
  it('never returns an empty id', () => {
    assert.equal(anchorId('!!!'), 'section')
  })
})

describe('extractHeadings', () => {
  it('lists h2 and h3 only, with unique ids matching the renderer', () => {
    const headings = extractHeadings(doc)
    assert.deepEqual(
      headings.map((h) => [h.level, h.id]),
      [
        [2, 'كيف-تختار-المورد'],
        [3, 'step-one-ask-for-the-licence'],
        [2, 'كيف-تختار-المورد-2'],
      ],
    )
    // The renderer numbers duplicates the same way.
    const seen = new Map<string, number>()
    assert.equal(uniqueAnchor('كيف تختار المورد؟', seen), 'كيف-تختار-المورد')
    assert.equal(uniqueAnchor('كيف تختار المورد؟', seen), 'كيف-تختار-المورد-2')
  })
})

describe('lexicalToPlainText', () => {
  it('flattens paragraphs, headings and lists to readable text', () => {
    const plain = lexicalToPlainText(doc)
    assert.match(plain, /Opening line\./)
    assert.match(plain, /- First\n- Second/)
    assert.match(plain, /\nكيف تختار المورد؟\n/)
  })
  it('returns an empty string for missing content', () => {
    assert.equal(lexicalToPlainText(null), '')
  })
})
