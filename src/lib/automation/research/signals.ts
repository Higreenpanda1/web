import { MODIFIERS, SEED_KEYWORDS, isRelevant } from './seeds.ts'

/**
 * The demand signals the research job gathers, each from a source that needs
 * no account or is optional:
 *
 *   Google autocomplete   what people are typing right now, per language and
 *                         country (Saudi Arabia, the Emirates). Free, no key.
 *   Google Trends         the day's trending searches per country, filtered
 *                         to the few that touch China trade. Free, no key.
 *   Semrush               search volume, CPC and difficulty for the seeds and
 *                         their related phrases — only with SEMRUSH_API_KEY.
 *
 * Every fetch has a short timeout and swallows its own failure into
 * `errors`: research with two of three sources is still research, and a
 * blocked endpoint on a Sunday night must not stop the week's articles.
 * Parsers are pure functions so they can be tested on saved responses.
 */

export type Market = { hl: 'ar' | 'en'; gl: string }

export type AutocompleteSignal = { market: Market; query: string; suggestions: string[] }
export type TrendItem = { title: string; traffic: string; news: string[] }
export type TrendsSignal = { geo: string; items: TrendItem[] }
export type KeywordRow = {
  keyword: string
  volume: number
  cpc: number
  competition: number
  difficulty?: number
}
export type KeywordSignal = { database: string; phrase: string; rows: KeywordRow[] }

export type Signals = {
  gatheredAt: string
  autocomplete: AutocompleteSignal[]
  trends: TrendsSignal[]
  keywords: KeywordSignal[]
  errors: string[]
}

export const DEFAULT_MARKETS: Market[] = [
  { hl: 'ar', gl: 'SA' },
  { hl: 'ar', gl: 'AE' },
  { hl: 'en', gl: 'AE' },
  { hl: 'en', gl: 'SA' },
]

const TIMEOUT_MS = 10_000
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

type Fetcher = typeof fetch

// ---------------------------------------------------------------------------
// Google autocomplete

/** The firefox client returns `["query", ["suggestion", …]]`. */
export function parseAutocomplete(body: string): string[] {
  try {
    const data = JSON.parse(body) as unknown
    if (!Array.isArray(data) || !Array.isArray(data[1])) return []
    return (data[1] as unknown[])
      .map((item) => (Array.isArray(item) ? item[0] : item))
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.replace(/<\/?b>/g, '').trim())
  } catch {
    return []
  }
}

export async function fetchAutocomplete(
  query: string,
  market: Market,
  fetcher: Fetcher = fetch,
): Promise<string[]> {
  const url = new URL('https://suggestqueries.google.com/complete/search')
  url.searchParams.set('client', 'firefox')
  url.searchParams.set('hl', market.hl)
  url.searchParams.set('gl', market.gl.toLowerCase())
  url.searchParams.set('q', query)
  const response = await fetcher(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': `${market.hl}-${market.gl}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`autocomplete ${response.status}`)
  // Google answers in ISO-8859-1 for some clients; reading bytes avoids mojibake.
  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') ?? ''
  const charset = /charset=([\w-]+)/i.exec(contentType)?.[1] ?? 'utf-8'
  let text: string
  try {
    text = new TextDecoder(charset).decode(buffer)
  } catch {
    text = new TextDecoder('utf-8').decode(buffer)
  }
  return parseAutocomplete(text)
}

/** Seeds × modifiers, per market, base queries first so a cap keeps the breadth. */
export function buildQueries(
  markets: Market[] = DEFAULT_MARKETS,
  seeds: Record<'ar' | 'en', string[]> = SEED_KEYWORDS,
  modifiedSeeds = 8,
): Array<{ market: Market; query: string }> {
  const base: Array<{ market: Market; query: string }> = []
  const extended: Array<{ market: Market; query: string }> = []
  for (const market of markets) {
    const list = seeds[market.hl]
    for (const seed of list) base.push({ market, query: seed })
    const mods = MODIFIERS[market.hl]
    for (const seed of list.slice(0, modifiedSeeds)) {
      for (const before of mods.before) extended.push({ market, query: `${before} ${seed}` })
      for (const after of mods.after) extended.push({ market, query: `${seed} ${after}` })
    }
  }
  return [...base, ...extended]
}

// ---------------------------------------------------------------------------
// Google Trends daily RSS

export function parseTrendsRss(xml: string): TrendItem[] {
  const items: TrendItem[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null
  while ((match = itemRe.exec(xml)) !== null) {
    const chunk = match[1] ?? ''
    const title = tag(chunk, 'title')
    if (!title) continue
    const traffic = tag(chunk, 'ht:approx_traffic') || ''
    const news = Array.from(
      chunk.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g),
      (m) => clean(m[1] ?? ''),
    ).filter(Boolean)
    items.push({ title, traffic, news })
  }
  return items
}

function tag(chunk: string, name: string): string {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`)
  return clean(re.exec(chunk)?.[1] ?? '')
}

function clean(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchTrendsDaily(
  geo: string,
  fetcher: Fetcher = fetch,
): Promise<TrendItem[]> {
  const response = await fetcher(
    `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`,
    {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  )
  if (!response.ok) throw new Error(`trends ${response.status}`)
  return parseTrendsRss(await response.text())
}

/** Only the trending searches that touch this business, with their news hooks. */
export function relevantTrends(items: TrendItem[]): TrendItem[] {
  return items.filter((item) => isRelevant(item.title) || item.news.some(isRelevant))
}

// ---------------------------------------------------------------------------
// Semrush (optional)

/** Semrush's analytics API answers CSV with semicolons; the first line is the header. */
export function parseSemrushCsv(body: string): KeywordRow[] {
  const lines = body.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2 || lines[0]?.startsWith('ERROR')) return []
  const header = (lines[0] ?? '').split(';').map((column) => column.trim().toLowerCase())
  const index = (name: string) => header.indexOf(name)
  const keyword = index('keyword')
  const volume = index('search volume')
  const cpc = index('cpc')
  const competition = index('competition')
  const difficulty = index('keyword difficulty index')
  if (keyword < 0) return []
  return lines.slice(1).map((line) => {
    const cells = line.split(';')
    const number = (at: number) => (at >= 0 ? Number(cells[at]) || 0 : 0)
    return {
      keyword: (cells[keyword] ?? '').trim(),
      volume: number(volume),
      cpc: number(cpc),
      competition: number(competition),
      ...(difficulty >= 0 ? { difficulty: number(difficulty) } : {}),
    }
  })
}

export async function fetchSemrushRelated(
  phrase: string,
  database: string,
  key: string,
  fetcher: Fetcher = fetch,
): Promise<KeywordRow[]> {
  const url = new URL('https://api.semrush.com/')
  url.searchParams.set('type', 'phrase_related')
  url.searchParams.set('key', key)
  url.searchParams.set('phrase', phrase)
  url.searchParams.set('database', database)
  url.searchParams.set('export_columns', 'Ph,Nq,Cp,Co,Kd')
  url.searchParams.set('display_limit', '25')
  url.searchParams.set('display_sort', 'nq_desc')
  const response = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`semrush ${response.status}`)
  return parseSemrushCsv(await response.text())
}

// ---------------------------------------------------------------------------
// Gathering

export type GatherOptions = {
  markets?: Market[]
  seeds?: Record<'ar' | 'en', string[]>
  maxQueries?: number
  trendsGeos?: string[]
  semrushKey?: string | null
  semrushDatabases?: string[]
  semrushPhrases?: number
  delayMs?: number
  fetcher?: Fetcher
  log?: (line: string) => void
}

export async function gatherSignals(options: GatherOptions = {}): Promise<Signals> {
  const fetcher = options.fetcher ?? fetch
  const log = options.log ?? (() => {})
  const delayMs = options.delayMs ?? 250
  const signals: Signals = {
    gatheredAt: new Date().toISOString(),
    autocomplete: [],
    trends: [],
    keywords: [],
    errors: [],
  }

  const queries = buildQueries(options.markets, options.seeds).slice(0, options.maxQueries ?? 160)
  let failures = 0
  for (const { market, query } of queries) {
    if (failures >= 8) {
      signals.errors.push('autocomplete: stopped after repeated failures')
      break
    }
    try {
      const suggestions = await fetchAutocomplete(query, market, fetcher)
      if (suggestions.length) signals.autocomplete.push({ market, query, suggestions })
    } catch (error) {
      failures++
      signals.errors.push(
        `autocomplete "${query}" (${market.hl}-${market.gl}): ${(error as Error).message}`,
      )
    }
    await sleep(delayMs)
  }
  log(`autocomplete: ${signals.autocomplete.length}/${queries.length} queries answered`)

  for (const geo of options.trendsGeos ?? ['SA', 'AE', 'EG']) {
    try {
      const items = await fetchTrendsDaily(geo, fetcher)
      signals.trends.push({ geo, items: relevantTrends(items) })
    } catch (error) {
      signals.errors.push(`trends ${geo}: ${(error as Error).message}`)
    }
    await sleep(delayMs)
  }
  log(`trends: ${signals.trends.reduce((sum, t) => sum + t.items.length, 0)} relevant item(s)`)

  const key = options.semrushKey ?? null
  if (key) {
    const databases = options.semrushDatabases ?? ['sa', 'ae']
    const perLanguage = options.semrushPhrases ?? 6
    for (const database of databases) {
      for (const language of ['ar', 'en'] as const) {
        for (const phrase of (options.seeds ?? SEED_KEYWORDS)[language].slice(0, perLanguage)) {
          try {
            const rows = await fetchSemrushRelated(phrase, database, key, fetcher)
            if (rows.length) signals.keywords.push({ database, phrase, rows })
          } catch (error) {
            signals.errors.push(`semrush "${phrase}" (${database}): ${(error as Error).message}`)
          }
          await sleep(delayMs)
        }
      }
    }
    log(`semrush: ${signals.keywords.length} phrase report(s)`)
  }

  return signals
}

/** Autocomplete phrases counted across seeds and markets — the ones that recur are the demand. */
export function rankSuggestions(
  signals: Pick<Signals, 'autocomplete'>,
): Array<{ phrase: string; count: number; markets: string[] }> {
  const seen = new Map<string, { phrase: string; count: number; markets: Set<string> }>()
  for (const entry of signals.autocomplete) {
    const market = `${entry.market.hl}-${entry.market.gl}`
    for (const suggestion of entry.suggestions) {
      const keyText = suggestion.toLowerCase().replace(/\s+/g, ' ').trim()
      const row = seen.get(keyText) ?? { phrase: suggestion, count: 0, markets: new Set<string>() }
      row.count++
      row.markets.add(market)
      seen.set(keyText, row)
    }
  }
  return Array.from(seen.values())
    .map((row) => ({ phrase: row.phrase, count: row.count, markets: Array.from(row.markets) }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
}

/** The signals as the planning prompt reads them, capped so the prompt stays affordable. */
export function describeSignals(
  signals: Signals,
  limits = { suggestions: 220, keywords: 120 },
): string {
  const parts: string[] = []
  const ranked = rankSuggestions(signals).slice(0, limits.suggestions)
  parts.push(
    ranked.length
      ? `## Google autocomplete (what people type; count = how many seed queries and markets surfaced it)\n${ranked
          .map((row) => `- ${row.phrase} (${row.count}; ${row.markets.join(', ')})`)
          .join('\n')}`
      : '## Google autocomplete\nUnavailable this run.',
  )
  const trendLines = signals.trends.flatMap((geo) =>
    geo.items.map(
      (item) =>
        `- [${geo.geo}] ${item.title}${item.traffic ? ` (${item.traffic})` : ''}${item.news.length ? ` — ${item.news.slice(0, 2).join(' | ')}` : ''}`,
    ),
  )
  parts.push(
    trendLines.length
      ? `## Google Trends, trending today and relevant to China trade\n${trendLines.join('\n')}`
      : '## Google Trends\nNothing relevant trending today.',
  )
  if (signals.keywords.length) {
    const rows = signals.keywords
      .flatMap((report) => report.rows.map((row) => ({ ...row, database: report.database })))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limits.keywords)
    parts.push(
      `## Keyword data (Semrush; monthly volume, CPC USD, difficulty)\n${rows
        .map(
          (row) =>
            `- ${row.keyword} [${row.database}]: ${row.volume}/mo, $${row.cpc}${row.difficulty !== undefined ? `, KD ${row.difficulty}` : ''}`,
        )
        .join('\n')}`,
    )
  }
  return parts.join('\n\n')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
