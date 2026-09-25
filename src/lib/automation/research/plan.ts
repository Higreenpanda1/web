import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod/v4'

import { MODEL, anthropic, contentJobsEnabled } from '@/lib/automation/claude'
import { VOICE } from '@/lib/automation/voice'
import { getPayloadClient } from '@/lib/payload'

import { describeUpcoming, upcomingEvents } from './calendar'
import { describeSignals, gatherSignals, type Signals } from './signals'
import { closest, isCovered } from './similarity'

import type { Category, Service } from '@/payload-types'

/**
 * The weekly market research. It gathers what people are searching for
 * (autocomplete, Trends, keyword data when a key exists), reads the trade
 * calendar, looks at what the blog already covers, and asks Claude for the
 * handful of articles that would earn traffic *and* lead to a service. Each
 * one becomes a queued topic with its evidence attached; the draft job then
 * writes them through the week.
 *
 * The model proposes; this file disposes. A proposed topic is dropped when it
 * says the same thing as a live article or a queued topic (similarity on
 * normalised tokens, both languages), when its category or service does not
 * exist, or when two proposals overlap. What survives is written to the
 * content queue with `source: research` and a `demandScore` that sets its
 * priority. Every run is recorded in Market research (research-runs).
 */

const topicSchema = z.object({
  ar: z.object({
    title: z
      .string()
      .min(15)
      .max(110)
      .describe('Arabic working title, a question or a plain statement.'),
    keyword: z.string().min(4).max(80).describe('The exact Arabic search phrase, as typed.'),
    brief: z
      .string()
      .min(120)
      .max(700)
      .describe('Three to five lines in Arabic: what to cover, for whom, which figures and steps.'),
  }),
  en: z.object({
    title: z.string().min(15).max(110),
    keyword: z.string().min(4).max(80),
    brief: z.string().min(120).max(700),
  }),
  category: z.string().describe('One of the category slugs given.'),
  intent: z.enum(['informational', 'commercial', 'transactional']),
  audience: z.string().min(10).max(120).describe('Who searches this, in one phrase.'),
  targetService: z.string().describe('The slug of the service this article should lead to.'),
  demandScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe('Evidence strength × business value, 0–100. 80+ only when several signals agree.'),
  seasonalHook: z.string().max(160).optional().describe('An event that makes it timely, if any.'),
  source: z
    .enum(['research', 'trend'])
    .describe('"trend" only when it comes from a Google Trends item.'),
  evidence: z
    .string()
    .min(20)
    .max(900)
    .describe('The exact signal lines this rests on, copied from the data given.'),
  rationale: z.string().min(20).max(400).describe('Why this, why now, and what it sells.'),
})

const planSchema = z.object({
  marketNotes: z
    .string()
    .min(80)
    .max(1500)
    .describe('What the signals say this week, in four to eight sentences. For the owner.'),
  topics: z.array(topicSchema).min(1).max(14),
})

export type PlannedTopic = z.infer<typeof topicSchema>

export type ResearchResult = {
  ranAt: string
  marketNotes: string
  added: Array<{
    id?: number
    title: string
    keyword: string
    category: string
    service: string | null
    demandScore: number
    intent: string
  }>
  skipped: Array<{ title: string; reason: string }>
  counts: {
    autocomplete: number
    suggestions: number
    trends: number
    keywords: number
    errors: number
  }
  report: string
}

export type ResearchOptions = {
  limit?: number
  dryRun?: boolean
  log?: (line: string) => void
  signals?: Signals
}

export function researchConfig() {
  return {
    topicsPerWeek: Number(process.env.RESEARCH_TOPICS_PER_WEEK ?? '6') || 6,
    maxQueries: Number(process.env.RESEARCH_MAX_QUERIES ?? '160') || 160,
    semrushKey: process.env.SEMRUSH_API_KEY?.trim() || null,
  }
}

export async function researchTopics(
  options: ResearchOptions = {},
): Promise<ResearchResult | null> {
  if (!contentJobsEnabled()) return null
  const log = options.log ?? ((line: string) => console.log(`[research] ${line}`))
  const config = researchConfig()
  const limit = options.limit ?? config.topicsPerWeek
  const payload = await getPayloadClient()

  // 1. What exists: live articles, queued topics, the services and categories.
  const inventory = await loadInventory(payload)
  log(
    `inventory: ${inventory.posts.length} article(s), ${inventory.queued.length} queued topic(s), ${inventory.services.length} service(s)`,
  )

  // 2. What people want: the signals.
  const signals =
    options.signals ??
    (await gatherSignals({ maxQueries: config.maxQueries, semrushKey: config.semrushKey, log }))
  const events = upcomingEvents(new Date())
  const counts = {
    autocomplete: signals.autocomplete.length,
    suggestions: signals.autocomplete.reduce((sum, entry) => sum + entry.suggestions.length, 0),
    trends: signals.trends.reduce((sum, entry) => sum + entry.items.length, 0),
    keywords: signals.keywords.reduce((sum, entry) => sum + entry.rows.length, 0),
    errors: signals.errors.length,
  }

  // 3. The plan.
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 24000,
    thinking: { type: 'adaptive' },
    output_config: { format: zodOutputFormat(planSchema), effort: 'high' },
    system: `${VOICE}\n\nYou are now the firm's content strategist. Your job is to choose the articles that will bring the most qualified visitors from search and answer engines in the next few weeks, and lead them to a service the firm sells.`,
    messages: [{ role: 'user', content: planningPrompt(inventory, signals, events, limit) }],
  })
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error(`no usable plan (${response.stop_reason})`)
  }
  const plan = response.parsed_output

  // 4. Dispose: drop what is covered, unknown or duplicated.
  const result: ResearchResult = {
    ranAt: new Date().toISOString(),
    marketNotes: plan.marketNotes,
    added: [],
    skipped: [],
    counts,
    report: '',
  }
  const covered = new Set<string>(
    [
      ...inventory.posts.flatMap((post) => [
        post.ar.title,
        post.ar.keyword,
        post.en.title,
        post.en.keyword,
      ]),
      ...inventory.queued.flatMap((topic) => [
        topic.ar.title,
        topic.ar.keyword,
        topic.en.title,
        topic.en.keyword,
      ]),
    ].filter(Boolean) as string[],
  )
  const acceptedTexts: string[] = []

  for (const topic of plan.topics) {
    if (result.added.length >= limit) {
      result.skipped.push({ title: topic.en.title, reason: 'over this week’s limit' })
      continue
    }
    const category = inventory.categories.find((entry) => entry.slug === topic.category)
    if (!category) {
      result.skipped.push({ title: topic.en.title, reason: `unknown category "${topic.category}"` })
      continue
    }
    const service = inventory.services.find((entry) => entry.slug === topic.targetService) ?? null
    const texts = [topic.ar.title, topic.ar.keyword, topic.en.title, topic.en.keyword]
    const duplicate = texts.find((text) => isCovered(text, covered))
    if (duplicate) {
      const near = closest(duplicate, covered)
      result.skipped.push({
        title: topic.en.title,
        reason: `already covered: "${near?.text ?? ''}" (${Math.round((near?.score ?? 0) * 100)}%)`,
      })
      continue
    }
    if (texts.some((text) => isCovered(text, acceptedTexts, 0.5))) {
      result.skipped.push({
        title: topic.en.title,
        reason: 'overlaps another topic chosen this run',
      })
      continue
    }

    let id: number | undefined
    if (!options.dryRun) {
      const created = await payload.create({
        collection: 'topics',
        locale: 'ar',
        depth: 0,
        data: {
          title: topic.ar.title,
          keyword: topic.ar.keyword,
          brief: topic.ar.brief,
          category: category.id,
          priority: Math.min(95, Math.max(5, 100 - topic.demandScore)),
          status: 'queued',
          source: topic.source,
          intent: topic.intent,
          targetService: service?.id,
          demandScore: topic.demandScore,
          audience: topic.audience,
          seasonalHook: topic.seasonalHook,
          evidence: `${topic.evidence}\n\nWhy: ${topic.rationale}`,
        },
      })
      await payload.update({
        collection: 'topics',
        id: created.id,
        locale: 'en',
        depth: 0,
        data: { title: topic.en.title, keyword: topic.en.keyword, brief: topic.en.brief },
      })
      id = created.id
    }
    acceptedTexts.push(...texts)
    result.added.push({
      id,
      title: topic.en.title,
      keyword: topic.en.keyword,
      category: category.slug,
      service: service?.slug ?? null,
      demandScore: topic.demandScore,
      intent: topic.intent,
    })
    log(
      `queued: ${topic.en.title} (${topic.demandScore}, ${topic.intent}, → ${service?.slug ?? 'no service'})`,
    )
  }

  result.report = buildReport(result, plan.topics, signals, events)

  if (!options.dryRun) {
    await payload.create({
      collection: 'research-runs',
      depth: 0,
      data: {
        ranAt: result.ranAt,
        summary: `${result.added.length} topic(s) queued from ${counts.suggestions} autocomplete phrases, ${counts.trends} trend(s), ${counts.keywords} keyword row(s)`,
        topicsAdded: result.added.length,
        report: result.report,
        signals: trimSignals(signals) as never,
      },
    })
  }
  log(`done: ${result.added.length} queued, ${result.skipped.length} skipped`)
  return result
}

// ---------------------------------------------------------------------------

type Inventory = {
  posts: Array<{
    slug: string
    ar: { title: string; keyword: string }
    en: { title: string; keyword: string }
  }>
  queued: Array<{ ar: { title: string; keyword: string }; en: { title: string; keyword: string } }>
  services: Array<{
    id: number
    slug: string
    title: string
    titleAr: string
    summary: string
    category: string
    priceFrom: number | null
    applicationType: string | null
  }>
  categories: Array<{ id: number; slug: string; title: string; titleAr: string }>
}

async function loadInventory(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
): Promise<Inventory> {
  const [postsAr, postsEn, topicsAr, topicsEn, servicesEn, servicesAr, categoriesEn, categoriesAr] =
    await Promise.all([
      payload.find({
        collection: 'posts',
        where: { _status: { equals: 'published' } },
        locale: 'ar',
        depth: 0,
        limit: 2000,
        select: { slug: true, title: true, focusKeyword: true },
      }),
      payload.find({
        collection: 'posts',
        where: { _status: { equals: 'published' } },
        locale: 'en',
        depth: 0,
        limit: 2000,
        select: { slug: true, title: true, focusKeyword: true },
      }),
      payload.find({
        collection: 'topics',
        where: { status: { in: ['queued', 'drafted'] } },
        locale: 'ar',
        depth: 0,
        limit: 500,
        select: { title: true, keyword: true },
      }),
      payload.find({
        collection: 'topics',
        where: { status: { in: ['queued', 'drafted'] } },
        locale: 'en',
        depth: 0,
        limit: 500,
        select: { title: true, keyword: true },
      }),
      payload.find({
        collection: 'services',
        where: { _status: { equals: 'published' } },
        locale: 'en',
        depth: 0,
        limit: 100,
        sort: 'order',
      }),
      payload.find({
        collection: 'services',
        where: { _status: { equals: 'published' } },
        locale: 'ar',
        depth: 0,
        limit: 100,
        sort: 'order',
      }),
      payload.find({ collection: 'categories', locale: 'en', depth: 0, limit: 100 }),
      payload.find({ collection: 'categories', locale: 'ar', depth: 0, limit: 100 }),
    ])

  const enBySlug = new Map(postsEn.docs.map((post) => [post.slug, post]))
  const topicsEnById = new Map(topicsEn.docs.map((topic) => [topic.id, topic]))
  const servicesArById = new Map(servicesAr.docs.map((service) => [service.id, service]))
  const categoriesArById = new Map(categoriesAr.docs.map((category) => [category.id, category]))

  return {
    posts: postsAr.docs.map((post) => ({
      slug: post.slug,
      ar: { title: post.title, keyword: post.focusKeyword ?? '' },
      en: {
        title: enBySlug.get(post.slug)?.title ?? '',
        keyword: enBySlug.get(post.slug)?.focusKeyword ?? '',
      },
    })),
    queued: topicsAr.docs.map((topic) => ({
      ar: { title: topic.title, keyword: topic.keyword },
      en: {
        title: topicsEnById.get(topic.id)?.title ?? '',
        keyword: topicsEnById.get(topic.id)?.keyword ?? '',
      },
    })),
    services: (servicesEn.docs as Service[]).map((service) => ({
      id: service.id,
      slug: service.slug,
      title: service.title,
      titleAr: servicesArById.get(service.id)?.title ?? service.title,
      summary: service.summary,
      category: service.category,
      priceFrom: typeof service.priceFrom === 'number' ? service.priceFrom : null,
      applicationType: service.applicationType ?? null,
    })),
    categories: (categoriesEn.docs as Category[]).map((category) => ({
      id: category.id,
      slug: category.slug,
      title: category.title,
      titleAr: categoriesArById.get(category.id)?.title ?? category.title,
    })),
  }
}

function planningPrompt(
  inventory: Inventory,
  signals: Signals,
  events: ReturnType<typeof upcomingEvents>,
  limit: number,
): string {
  const services = inventory.services
    .map(
      (service) =>
        `- ${service.slug} — ${service.title} / ${service.titleAr}${service.priceFrom ? ` (from ¥${service.priceFrom})` : ''}${service.applicationType ? ` [application form]` : ''}: ${service.summary}`,
    )
    .join('\n')
  const categories = inventory.categories
    .map((category) => `- ${category.slug} — ${category.title} / ${category.titleAr}`)
    .join('\n')
  const existing = inventory.posts
    .map(
      (post) =>
        `- ${post.en.title || post.ar.title}${post.en.keyword ? ` [${post.en.keyword}]` : ''} | ${post.ar.title}`,
    )
    .join('\n')
  const queued = inventory.queued.length
    ? inventory.queued
        .map((topic) => `- ${topic.en.title || topic.ar.title} | ${topic.ar.title}`)
        .join('\n')
    : '- (empty)'

  return `Choose the ${limit} best new articles for the coming week, plus up to ${Math.min(6, limit)} reserves, ranked by demandScore. Today is ${new Date().toISOString().slice(0, 10)}.

## What we sell (slug — name: summary). Every topic must name the one it leads to.
${services}

## Blog categories (slug — name). Every topic must use one of these slugs.
${categories}

## Trade calendar for the next weeks. Prefer topics that arrive before the event, not after.
${describeUpcoming(events)}

## Live demand signals, gathered ${signals.gatheredAt.slice(0, 10)}
${describeSignals(signals)}

## Articles already live (do not propose these or close variants)
${existing}

## Topics already queued (do not propose these either)
${queued}

## Rules
1. Each topic targets one search phrase people actually type, in Arabic and in English, taken from or closely matching the signals above. The article's title contains the phrase naturally.
2. At least half the topics are commercial or transactional: costs, requirements, "how much", "which is better", "how long", "is it worth". Informational topics are allowed when they are the first step of a buying journey.
3. Every topic leads to one service (targetService). Say in the brief where the service fits — once, near the end, never as a sales pitch.
4. Nothing already covered: check the live articles and queued topics, in both languages, including paraphrases. A different angle on a covered subject counts as covered unless the search phrase is genuinely different.
5. Prefer Saudi Arabia, the Emirates and Yemen as the reader's country; name the country in the title when the answer depends on it (duties, SABER, ports, banking).
6. The brief lists the concrete figures, steps, documents and caveats the article must contain, so a writer without market knowledge cannot produce a vague piece. Figures must be ones you are confident about or marked "check current rule".
7. demandScore: 80–100 when autocomplete, trends and keyword data agree and the intent is commercial; 50–79 for one strong signal; below 50 for calendar-only or judgement picks. Be honest; the score sets the queue order.
8. source is "trend" only for a topic that exists because of a Google Trends item; "research" otherwise.
9. Evidence quotes the exact lines from the signals (phrases, counts, volumes, the trend, the calendar entry) — nothing invented.
10. Titles: questions or plain statements, no clickbait, no exclamation marks, no emoji. Western numerals in both languages.`
}

function buildReport(
  result: ResearchResult,
  proposed: PlannedTopic[],
  signals: Signals,
  events: ReturnType<typeof upcomingEvents>,
): string {
  const lines: string[] = []
  lines.push(`# Market research — ${result.ranAt.slice(0, 16).replace('T', ' ')} UTC`, '')
  lines.push('## What the market says', result.marketNotes, '')
  lines.push('## Signals gathered')
  lines.push(
    `- autocomplete: ${result.counts.autocomplete} queries answered, ${result.counts.suggestions} phrases`,
    `- trends: ${result.counts.trends} relevant item(s) across ${signals.trends.map((t) => t.geo).join(', ') || 'no geo'}`,
    `- keyword data: ${result.counts.keywords} row(s)${signals.keywords.length ? '' : ' (no SEMRUSH_API_KEY)'}`,
    `- errors: ${result.counts.errors}${signals.errors.length ? `\n  ${signals.errors.slice(0, 5).join('\n  ')}` : ''}`,
    '',
  )
  lines.push('## Calendar', describeUpcoming(events), '')
  lines.push('## Queued')
  for (const topic of result.added) {
    const full = proposed.find((entry) => entry.en.title === topic.title)
    lines.push(
      `- **${topic.title}** — ${topic.keyword} · ${topic.category} · ${topic.intent} · score ${topic.demandScore} · → ${topic.service ?? 'no service'}`,
    )
    if (full) {
      lines.push(`  Arabic: ${full.ar.title} — ${full.ar.keyword}`)
      lines.push(
        `  Audience: ${full.audience}${full.seasonalHook ? ` · Hook: ${full.seasonalHook}` : ''}`,
      )
      lines.push(`  Evidence: ${full.evidence.replace(/\s+/g, ' ').slice(0, 400)}`)
      lines.push(`  Why: ${full.rationale}`)
    }
  }
  if (result.skipped.length) {
    lines.push('', '## Skipped')
    for (const item of result.skipped) lines.push(`- ${item.title}: ${item.reason}`)
  }
  return lines.join('\n')
}

/** What is worth keeping of the raw signals: enough to audit a choice, not every byte. */
function trimSignals(signals: Signals) {
  return {
    gatheredAt: signals.gatheredAt,
    autocomplete: signals.autocomplete.slice(0, 200),
    trends: signals.trends,
    keywords: signals.keywords.map((report) => ({ ...report, rows: report.rows.slice(0, 25) })),
    errors: signals.errors.slice(0, 20),
  }
}
