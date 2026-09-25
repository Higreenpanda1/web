import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { checkDraft, containsPhrase, stripLinks } from './quality.ts'

import type { ArticleDraft } from './blocks.ts'

function words(n: number, word = 'كلمة'): string {
  return Array.from({ length: n }, () => word).join(' ')
}

function goodDraft(): ArticleDraft {
  return {
    title: 'كم تكلفة الاستيراد من الصين إلى السعودية في 2026؟',
    excerpt: 'حساب كامل لتكلفة شحنة نموذجية من المصنع إلى مستودعك في الرياض، بالأرقام.',
    seoDescription:
      'تكلفة الاستيراد من الصين إلى السعودية: سعر المصنع والشحن والجمارك 5% والضريبة 15% وسابر، مع مثال محسوب.',
    focusKeyword: 'تكلفة الاستيراد من الصين إلى السعودية',
    body: [
      {
        type: 'p',
        text: `تكلفة الاستيراد من الصين إلى السعودية تتكوّن من خمسة بنود. ${words(60)}`,
      },
      { type: 'h2', text: 'ما الذي يدخل في التكلفة؟' },
      {
        type: 'p',
        text: `${words(200)} انظر [دليل الشحن](/blog/shipping) و[الفحص](/blog/inspection).`,
      },
      { type: 'h2', text: 'كيف تحسب الجمارك؟' },
      { type: 'ol', items: [words(40), words(40), words(40)] },
      { type: 'h2', text: 'الأخطاء الشائعة' },
      { type: 'ul', items: [words(30), words(30)] },
      { type: 'h2', text: 'ماذا تفعل الآن؟' },
      {
        type: 'p',
        text: `${words(450)} يمكن أن نتولى [إدارة الاستيراد كاملة](/services/full-import-management).`,
      },
    ],
    keyTakeaways: [words(8), words(8), words(8)],
    faqs: [
      { question: `${words(4)}؟`, answer: words(20) },
      { question: `${words(4)}؟`, answer: words(20) },
      { question: `${words(4)}؟`, answer: words(20) },
    ],
  }
}

const allowed = new Set(['/blog/shipping', '/blog/inspection', '/services/full-import-management'])

describe('checkDraft', () => {
  it('passes a sound article', () => {
    const report = checkDraft(goodDraft(), {
      locale: 'ar',
      keyword: 'تكلفة الاستيراد من الصين إلى السعودية',
      allowedLinks: allowed,
      mustLink: '/services/full-import-management',
    })
    assert.deepEqual(report.issues, [])
    assert.ok(report.ok)
    assert.equal(report.links, 3)
  })
  it('names each failure', () => {
    const draft = goodDraft()
    draft.title = 'عنوان آخر تمامًا!'
    draft.body = draft.body.slice(0, 3)
    draft.body[2] = { type: 'p', text: 'رخيص [رابط](/blog/nope)' }
    const report = checkDraft(draft, {
      locale: 'ar',
      keyword: 'تكلفة الاستيراد من الصين',
      allowedLinks: allowed,
    })
    assert.ok(!report.ok)
    assert.ok(report.issues.some((issue) => issue.includes('words')))
    assert.ok(report.issues.some((issue) => issue.includes('exclamation')))
    assert.ok(report.issues.some((issue) => issue.includes('رخيص')))
    assert.ok(report.issues.some((issue) => issue.includes('outside the inventory')))
    assert.ok(report.issues.some((issue) => issue.includes('fewer than 3 sections')))
  })
  it('flags an Arabic article written in English', () => {
    const draft = goodDraft()
    draft.body = draft.body.map((block) =>
      'items' in block
        ? { ...block, items: block.items.map(() => words(30, 'word')) }
        : { ...block, text: words(120, 'word') },
    ) as ArticleDraft['body']
    const report = checkDraft(draft, {
      locale: 'ar',
      keyword: 'تكلفة الاستيراد',
      allowedLinks: allowed,
    })
    assert.ok(report.issues.some((issue) => issue.includes('Latin')))
  })
})

describe('containsPhrase', () => {
  it('is order-free and tolerant of the article and prefixes', () => {
    assert.ok(
      containsPhrase(
        'كم تكلفة الاستيراد من الصين للسعودية',
        'تكلفة الاستيراد من الصين إلى السعودية',
      ),
    )
    assert.ok(
      containsPhrase(
        'Importing from China to the UAE: the costs',
        'cost of importing from china to uae',
      ),
    )
    assert.ok(!containsPhrase('Canton Fair dates', 'verify chinese supplier'))
  })
})

describe('stripLinks', () => {
  it('removes links outside the inventory and keeps their text', () => {
    const { blocks, removed } = stripLinks(
      [
        { type: 'p', text: 'See [a](/blog/a) and [b](https://x.test/b).' },
        { type: 'ul', items: ['[c](/blog/c)'] },
      ],
      new Set(['/blog/a']),
    )
    assert.deepEqual(removed, ['https://x.test/b', '/blog/c'])
    assert.equal((blocks[0] as { text: string }).text, 'See [a](/blog/a) and b.')
    assert.deepEqual((blocks[1] as { items: string[] }).items, ['c'])
  })
})
