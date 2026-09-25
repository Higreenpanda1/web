import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildQueries,
  describeSignals,
  gatherSignals,
  parseAutocomplete,
  parseSemrushCsv,
  parseTrendsRss,
  rankSuggestions,
  relevantTrends,
} from './signals.ts'

describe('parseAutocomplete', () => {
  it('reads the firefox client shape', () => {
    const body = JSON.stringify([
      'الاستيراد من الصين',
      ['الاستيراد من الصين للسعودية', 'الاستيراد من الصين بالجملة'],
    ])
    assert.deepEqual(parseAutocomplete(body), [
      'الاستيراد من الصين للسعودية',
      'الاستيراد من الصين بالجملة',
    ])
  })
  it('tolerates nested entries and bad JSON', () => {
    assert.deepEqual(parseAutocomplete('["q", [["a", 0], ["<b>b</b>", 0]]]'), ['a', 'b'])
    assert.deepEqual(parseAutocomplete('not json'), [])
    assert.deepEqual(parseAutocomplete('{}'), [])
  })
})

describe('buildQueries', () => {
  it('puts every base seed before any modified one, per market', () => {
    const queries = buildQueries([{ hl: 'en', gl: 'AE' }], {
      ar: [],
      en: ['import from china', 'canton fair'],
    })
    assert.deepEqual(
      queries.slice(0, 2).map((q) => q.query),
      ['import from china', 'canton fair'],
    )
    assert.ok(queries.some((q) => q.query === 'how to import from china'))
    assert.ok(queries.some((q) => q.query === 'canton fair 2026'))
  })
  it('uses the market’s own language seeds', () => {
    const queries = buildQueries([{ hl: 'ar', gl: 'SA' }], {
      ar: ['معرض كانتون'],
      en: ['canton fair'],
    })
    assert.ok(queries.every((q) => /كانتون/.test(q.query)))
  })
})

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title>Canton Fair 2026</title><ht:approx_traffic>20,000+</ht:approx_traffic>
<ht:news_item><ht:news_item_title><![CDATA[Canton Fair opens &amp; draws buyers]]></ht:news_item_title></ht:news_item></item>
<item><title>Al Hilal</title><ht:approx_traffic>200,000+</ht:approx_traffic></item>
<item><title>رسوم جمركية جديدة</title><ht:approx_traffic>5,000+</ht:approx_traffic></item>
</channel></rss>`

describe('parseTrendsRss', () => {
  it('reads titles, traffic and news headlines', () => {
    const items = parseTrendsRss(RSS)
    assert.equal(items.length, 3)
    assert.deepEqual(items[0], {
      title: 'Canton Fair 2026',
      traffic: '20,000+',
      news: ['Canton Fair opens & draws buyers'],
    })
  })
  it('keeps only what touches the business', () => {
    const kept = relevantTrends(parseTrendsRss(RSS)).map((item) => item.title)
    assert.deepEqual(kept, ['Canton Fair 2026', 'رسوم جمركية جديدة'])
  })
})

describe('parseSemrushCsv', () => {
  it('reads the semicolon CSV by header name', () => {
    const rows = parseSemrushCsv(
      'Keyword;Search Volume;CPC;Competition;Keyword Difficulty Index\nimport from china;1900;1.20;0.45;38\ncanton fair;5400;0.30;0.10;52\n',
    )
    assert.deepEqual(rows[0], {
      keyword: 'import from china',
      volume: 1900,
      cpc: 1.2,
      competition: 0.45,
      difficulty: 38,
    })
    assert.equal(rows.length, 2)
  })
  it('returns nothing for an error body', () => {
    assert.deepEqual(parseSemrushCsv('ERROR 50 :: NOTHING FOUND'), [])
  })
})

describe('gatherSignals', () => {
  it('keeps going when a source fails and records the error', async () => {
    const calls: string[] = []
    const fetcher = (async (input: URL | RequestInfo) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('suggestqueries')) {
        const q = new URL(url).searchParams.get('q') ?? ''
        return new Response(JSON.stringify([q, [`${q} cost`, `${q} 2026`]]), {
          headers: { 'content-type': 'application/json; charset=utf-8' },
        })
      }
      if (url.includes('trends.google.com')) return new Response(RSS)
      return new Response('boom', { status: 500 })
    }) as typeof fetch
    const signals = await gatherSignals({
      markets: [{ hl: 'en', gl: 'AE' }],
      seeds: { ar: [], en: ['canton fair'] },
      maxQueries: 3,
      trendsGeos: ['SA'],
      semrushKey: 'k',
      semrushDatabases: ['sa'],
      semrushPhrases: 1,
      delayMs: 0,
      fetcher,
    })
    assert.equal(signals.autocomplete.length, 3)
    assert.equal(signals.trends[0]?.items.length, 2)
    assert.equal(signals.keywords.length, 0)
    assert.ok(signals.errors.some((error) => error.startsWith('semrush')))
    const ranked = rankSuggestions(signals)
    assert.ok(ranked.length >= 4)
    const text = describeSignals(signals)
    assert.match(text, /Google autocomplete/)
    assert.match(text, /Canton Fair 2026/)
  })
})
