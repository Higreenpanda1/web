import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { articleFileSchema, nextPublishSlots, topicFileSchema } from './offline-schema.ts'

describe('nextPublishSlots', () => {
  it('lands on the next Sunday, Tuesday and Thursday at 06:00 UTC', () => {
    const slots = nextPublishSlots(new Date('2026-09-25T12:00:00Z'), { posts: [] })
    assert.equal(slots.next(), '2026-09-27T06:00:00.000Z')
    assert.equal(slots.next(), '2026-09-29T06:00:00.000Z')
    assert.equal(slots.next(), '2026-10-01T06:00:00.000Z')
    assert.equal(slots.next(), '2026-10-04T06:00:00.000Z')
  })
  it('continues after dates the archive already holds in the future', () => {
    const slots = nextPublishSlots(new Date('2026-09-25T12:00:00Z'), {
      posts: [
        { publishedAt: '2026-09-29T06:00:00.000Z' },
        { publishedAt: '2026-10-01T06:00:00.000Z' },
        { publishedAt: '2026-05-01T06:00:00.000Z' },
      ],
    } as never)
    assert.equal(slots.next(), '2026-10-04T06:00:00.000Z')
  })
})

describe('file schemas', () => {
  it('accepts a topic file and rejects a bad slug', () => {
    const good = {
      marketNotes: 'x'.repeat(90),
      topics: [
        {
          slug: 'golden-week-2026-what-to-ship-before',
          ar: {
            title: 'عطلة العيد الوطني الصيني 2026: ماذا تطلب وتشحن قبلها؟',
            keyword: 'عطلة العيد الوطني الصيني',
            brief: 'ب'.repeat(130),
          },
          en: {
            title: 'Golden Week 2026: what to order and ship before China closes',
            keyword: 'golden week china factories closed',
            brief: 'b'.repeat(130),
          },
          category: 'shipping-logistics',
          intent: 'commercial',
          audience: 'Gulf importer with orders in production',
          service: 'shipping-and-freight',
          demandScore: 70,
          evidence: 'e'.repeat(30),
          rationale: 'r'.repeat(30),
        },
      ],
    }
    assert.ok(topicFileSchema.safeParse(good).success)
    const bad = { ...good, topics: [{ ...good.topics[0], slug: 'Bad Slug' }] }
    assert.ok(!topicFileSchema.safeParse(bad).success)
  })
  it('requires sources on each language of an article file', () => {
    const article = {
      title: 't'.repeat(20),
      excerpt: 'e'.repeat(70),
      seoDescription: 's'.repeat(100),
      focusKeyword: 'keyword',
      body: Array.from({ length: 6 }, () => ({ type: 'p', text: 'p' })),
      keyTakeaways: ['k'.repeat(25), 'k'.repeat(25), 'k'.repeat(25)],
      faqs: Array.from({ length: 3 }, () => ({ question: 'q'.repeat(12), answer: 'a'.repeat(70) })),
      sources: [{ title: 'ZATCA', url: 'https://zatca.gov.sa/' }],
    }
    assert.ok(
      articleFileSchema.safeParse({
        slug: 'a-b',
        category: 'importing',
        service: 'product-sourcing',
        ar: article,
        en: article,
      }).success,
    )
    assert.ok(
      !articleFileSchema.safeParse({
        slug: 'a-b',
        category: 'importing',
        service: 'product-sourcing',
        ar: article,
        en: { ...article, sources: [] },
      }).success,
    )
  })
})
