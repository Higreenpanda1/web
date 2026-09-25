import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import { CATALOGUE_SERVICES } from '@/seed/catalogue'
import { CATEGORIES, SERVICES } from '@/seed/content'

import { blocksToLexical, blocksWordCount } from './blocks'
import {
  articleFileSchema,
  nextPublishSlots,
  topicFileSchema,
  type ArticleFile,
  type TopicFile,
} from './offline-schema'
import { checkDraft, stripLinks } from './quality'
import { describeUpcoming, upcomingEvents } from './research/calendar'
import { SEED_KEYWORDS } from './research/seeds'
import { closest, isCovered } from './research/similarity'
import { loadArchive, saveArchive, type Archive, type ArchivePost, type Locale } from './rewrite'
import { VOICE } from './voice'

/**
 * The weekly engine without the API: the same research → topics → articles
 * pipeline, driven by a person or by a Claude session in an editor rather
 * than by `ANTHROPIC_API_KEY`, and landing in git rather than in the
 * database. The Routine that runs it each week is described in DEPLOY.md
 * §8c; a deploy (`npm run seed` inside `ops/deploy.sh`) imports what it
 * committed.
 *
 *   npm run posts:plan-pack     → .plan/PLAN.md      the research brief: what we sell, what
 *                                                    exists, the calendar, the seeds to search,
 *                                                    the rules and the JSON to produce
 *   (research)                  → .plan/topics.json  the week's topics, with evidence
 *   npm run posts:write-packs   → .write/packs/*.md  one writing brief per topic, with the
 *                                                    link inventory in both languages
 *   (write)                     → .write/out/*.json  the articles, both languages
 *   npm run posts:write-apply   → validates each one (schema, quality gate, links),
 *                                 appends it to src/seed/wp/posts.json with a publish date
 *                                 on the next Gulf working days, moves it to .write/applied/
 *
 * Everything the API path checks is checked here too; only the model call is
 * replaced by whoever is reading the pack.
 */

const ALL_SERVICES = [...SERVICES, ...CATALOGUE_SERVICES]

// ---------------------------------------------------------------------------
// 1. The research brief

export function writePlanPack(dir = '.plan'): string {
  mkdirSync(dir, { recursive: true })
  const archive = loadArchive()
  const today = new Date()
  const file = path.join(dir, 'PLAN.md')
  writeFileSync(file, planPack(archive, today))
  writeFileSync(path.join(dir, 'FORMAT.md'), topicsFormat())
  return file
}

function planPack(archive: Archive, today: Date): string {
  const services = ALL_SERVICES.map(
    (service) =>
      `- ${service.slug} — ${service.en.title} / ${service.ar.title}${service.priceFrom ? ` (from ¥${service.priceFrom})` : ''}: ${service.en.summary}`,
  ).join('\n')
  const categories = CATEGORIES.map((c) => `- ${c.slug} — ${c.en} / ${c.ar}`).join('\n')
  const existing = archive.posts
    .filter((post) => post.status === 'published')
    .map(
      (post) =>
        `- ${post.locales.en?.title ?? ''}${post.locales.en?.focusKeyword ? ` [${post.locales.en.focusKeyword}]` : ''} | ${post.locales.ar?.title ?? ''}${post.locales.ar?.focusKeyword ? ` [${post.locales.ar.focusKeyword}]` : ''} (${post.categories.join(', ')}, ${post.publishedAt.slice(0, 10)})`,
    )
    .join('\n')
  const seeds = (['ar', 'en'] as const)
    .map(
      (lang) =>
        `${lang === 'ar' ? 'Arabic' : 'English'}:\n${SEED_KEYWORDS[lang].map((s) => `- ${s}`).join('\n')}`,
    )
    .join('\n\n')

  return `# Weekly market research — ${today.toISOString().slice(0, 10)}

${VOICE}

You are the firm's content strategist. Choose the articles for the coming week that will bring the most qualified visitors from search and answer engines and lead them to a service the firm sells. Write the result to \`topics.json\` in this directory, in the shape described in FORMAT.md.

## 1. Gather the signals yourself (no API here)

Use web search. For each seed phrase below (and the obvious variations a Gulf importer types), look at:
- what Google suggests and what "People also ask" shows for it, in Arabic (Saudi Arabia, the Emirates) and in English (the Emirates);
- what is in the news this week about China trade, tariffs, customs, shipping rates, the Canton Fair, Alibaba/1688/Temu/Shein, SABER, ZATCA, Dubai Customs, Chinese visas for Gulf passports, the yuan;
- Google Trends for the same terms in SA and AE, if reachable.
Quote what you found in each topic's \`evidence\`. Do not invent volumes.

Seed phrases:

${seeds}

## 2. What we sell (slug — name: summary). Every topic leads to one of these.
${services}

## 3. Blog categories (slug — name). Every topic uses one of these slugs.
${categories}

## 4. Trade calendar for the next weeks. Prefer topics that arrive before the event.
${describeUpcoming(upcomingEvents(today))}

## 5. Articles already live (do not propose these or close variants, in either language)
${existing}

## 6. Rules
1. Each topic targets one search phrase people actually type, in Arabic and in English. The article's title contains the phrase naturally.
2. At least half the topics are commercial or transactional: costs, requirements, "how much", "which is better", "how long", "is it worth". Informational topics are allowed when they are the first step of a buying journey.
3. Every topic leads to one service (\`service\`). Say in the brief where the service fits — once, near the end, never as a sales pitch.
4. Nothing already covered: check section 5 in both languages, including paraphrases. A different angle on a covered subject counts as covered unless the search phrase is genuinely different.
5. Prefer Saudi Arabia, the Emirates and Yemen as the reader's country; name the country in the title when the answer depends on it (duties, SABER, ports, banking).
6. The brief lists the concrete figures, steps, documents and caveats the article must contain — with their sources where you found them — so a writer without market knowledge cannot produce a vague piece. Figures must be ones you verified or marked "check current rule".
7. demandScore: 80–100 when several signals agree and the intent is commercial; 50–79 for one strong signal; below 50 for calendar-only or judgement picks. Be honest; the score sets the order.
8. Titles: questions or plain statements, no clickbait, no exclamation marks, no emoji. Western numerals in both languages. Slugs: short, English, hyphenated.
9. Propose the number asked for plus two reserves, best first.
`
}

function topicsFormat(): string {
  return `# topics.json

{
  "marketNotes": "What the signals say this week, four to eight sentences, for the owner.",
  "topics": [
    {
      "slug": "import-cost-china-to-saudi-arabia-2026",
      "ar": { "title": "…", "keyword": "…", "brief": "Three to five lines: what to cover, for whom, which figures, steps and documents, with sources." },
      "en": { "title": "…", "keyword": "…", "brief": "…" },
      "category": "importing",
      "intent": "commercial",
      "audience": "Saudi importer placing a first order",
      "service": "full-import-management",
      "demandScore": 85,
      "seasonalHook": "optional",
      "source": "research",
      "evidence": "The exact signals: suggestions, questions, headlines, trends — copied, not invented.",
      "rationale": "Why this, why now, what it sells."
    }
  ]
}
`
}

// ---------------------------------------------------------------------------
// 2. The writing briefs

export function writeArticlePacks(options: { planDir?: string; dir?: string } = {}): {
  written: number
  rejected: string[]
} {
  const planDir = options.planDir ?? '.plan'
  const dir = options.dir ?? '.write'
  const raw = JSON.parse(readFileSync(path.join(planDir, 'topics.json'), 'utf8')) as unknown
  const parsed = topicFileSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(
      `topics.json does not match the schema:\n${parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n')}`,
    )
  }
  const archive = loadArchive()
  const covered = archive.posts.flatMap((post) =>
    [
      post.locales.ar?.title,
      post.locales.ar?.focusKeyword,
      post.locales.en?.title,
      post.locales.en?.focusKeyword,
    ].filter((value): value is string => Boolean(value)),
  )
  const packs = path.join(dir, 'packs')
  mkdirSync(packs, { recursive: true })
  mkdirSync(path.join(dir, 'out'), { recursive: true })
  const rejected: string[] = []
  let written = 0
  const accepted: string[] = []
  for (const topic of parsed.data.topics) {
    if (!CATEGORIES.some((c) => c.slug === topic.category)) {
      rejected.push(`${topic.slug}: unknown category "${topic.category}"`)
      continue
    }
    if (!ALL_SERVICES.some((s) => s.slug === topic.service)) {
      rejected.push(`${topic.slug}: unknown service "${topic.service}"`)
      continue
    }
    if (archive.posts.some((post) => post.slug === topic.slug)) {
      rejected.push(`${topic.slug}: slug already exists`)
      continue
    }
    const texts = [topic.ar.title, topic.ar.keyword, topic.en.title, topic.en.keyword]
    const duplicate = texts.find((text) => isCovered(text, covered))
    if (duplicate) {
      const near = closest(duplicate, covered)
      rejected.push(
        `${topic.slug}: already covered by "${near?.text}" (${Math.round((near?.score ?? 0) * 100)}%)`,
      )
      continue
    }
    if (texts.some((text) => isCovered(text, accepted, 0.5))) {
      rejected.push(`${topic.slug}: overlaps another topic in this file`)
      continue
    }
    accepted.push(...texts)
    writeFileSync(path.join(packs, `${topic.slug}.md`), articlePack(archive, topic))
    written++
  }
  writeFileSync(path.join(dir, 'FORMAT.md'), articleFormat())
  return { written, rejected }
}

export function archiveInventory(
  archive: Archive,
  categories: string[],
  locale: Locale,
  serviceSlug: string | null,
) {
  const prefix = locale === 'en' ? '/en' : ''
  const seen = new Set<string>()
  const lines: string[] = []
  const add = (p: string, title: string, note = '') => {
    if (seen.has(p)) return
    seen.add(p)
    lines.push(`- ${p} — ${title}${note}`)
  }
  const posts = archive.posts
    .filter((post) => post.status === 'published' && post.locales[locale])
    .map((post) => ({
      post,
      shared: post.categories.filter((c) => categories.includes(c)).length,
      date: post.publishedAt,
    }))
    .sort((a, b) => b.shared - a.shared || b.date.localeCompare(a.date))
    .slice(0, 16)
  for (const { post } of posts) add(`${prefix}/blog/${post.slug}`, post.locales[locale]!.title)
  const service = ALL_SERVICES.find((s) => s.slug === serviceSlug)
  if (service)
    add(
      `${prefix}/services/${service.slug}`,
      service[locale].title,
      ' (the service this article leads to)',
    )
  for (const entry of ALL_SERVICES)
    add(`${prefix}/services/${entry.slug}`, entry[locale].title, ' (service page)')
  add(`${prefix}/apply/consultation`, locale === 'ar' ? 'حجز استشارة' : 'Book a consultation')
  return { text: lines.join('\n'), allowed: seen, serviceTitle: service?.[locale].title ?? null }
}

function articlePack(archive: Archive, topic: TopicFile['topics'][number]): string {
  const category = CATEGORIES.find((c) => c.slug === topic.category)!
  const ar = archiveInventory(archive, [topic.category], 'ar', topic.service)
  const en = archiveInventory(archive, [topic.category], 'en', topic.service)
  return `# ${topic.slug}

${VOICE}

Write one article in Arabic, then its English version, and save both in \`../out/${topic.slug}.json\` in the shape in ../FORMAT.md.

## The topic
- Arabic title (working): ${topic.ar.title}
- Arabic search phrase (must appear in the title, the first paragraph, one heading and the meta description): ${topic.ar.keyword}
- English title (working): ${topic.en.title}
- English search phrase (same rule): ${topic.en.keyword}
- Category: ${category.en} / ${category.ar}
- Reader: ${topic.audience}
- Intent: ${topic.intent}${topic.seasonalHook ? `\n- Timely because: ${topic.seasonalHook}` : ''}
- Leads to the service: ${topic.service} (${en.serviceTitle} / ${ar.serviceTitle})

## Brief (Arabic)
${topic.ar.brief}

## Brief (English)
${topic.en.brief}

## Evidence the topic rests on
${topic.evidence}

## Structure, in this order (both languages)
1. A first paragraph of 40 to 70 words that answers the question in the title directly, with the key figure or the key step — the sentences an assistant would quote. No preamble.
2. Four to seven H2 sections, some with H3s. Phrase at least three H2s as the questions people ask. Include one numbered step list, one checklist, one comparison as a list (options, and what each costs or takes), and a "common mistakes" section.
3. At least three concrete figures with their year and their source named in the text (a duty rate, a fee, a lead time, a price range). Where a figure changes often, give the range and say what to check and where. Verify figures with web search; never invent a number, a law or a price.
4. A closing "what to do next" section: three actions the reader can take this week, then one sentence that says what HiGreenPanda can take off their hands, with the link to the service.
5. 1,200 to 1,800 words per language. The English is a faithful rendering of the Arabic: same structure, figures, caveats and sources, British spelling — not a new article.

## Links
Use the exact syntax [anchor text](path) with paths from the inventory for that language and nothing else. Place 3 to 6 links per language, each path at most once, only where the linked page genuinely helps at that point; at least two to other articles; exactly one to the service page, in the closing section. Inline markup allowed: links and **bold**. No HTML, no tables, no headings inside text.

### Arabic inventory (the only paths the Arabic may use)
${ar.text}

### English inventory (the only paths the English may use)
${en.text}

## Then, per language
- excerpt: one or two sentences, 60–280 characters
- seoDescription: 80–158 characters, contains the search phrase
- focusKeyword: the search phrase
- keyTakeaways: three to five one-sentence statements a reader could act on, 20–220 characters each
- faqs: three to six real search queries with direct two- or three-sentence answers (60–700 characters)
- sources: two to five official or primary pages the figures come from (customs authorities, ministries, standards bodies, port authorities, the fair's organiser, statistics offices) — real URLs you opened, on the organisation's own domain; when unsure of the exact page, the organisation's homepage. Never invent a URL.

## House rules the validator enforces
No exclamation marks. No emoji. Never "cheap" / "رخيص". No guarantees. Western numerals. Arabic that reads as a Gulf trader reads it; English that is English.
`
}

function articleFormat(): string {
  return `# out/<slug>.json

{
  "slug": "<slug>",
  "category": "<category slug>",
  "service": "<service slug>",
  "ar": {
    "title": "…", "excerpt": "…", "seoDescription": "…", "focusKeyword": "…",
    "body": [
      { "type": "p", "text": "Opening paragraph…" },
      { "type": "h2", "text": "Section heading" },
      { "type": "h3", "text": "Sub-heading" },
      { "type": "ul", "items": ["…", "…"] },
      { "type": "ol", "items": ["…", "…"] }
    ],
    "keyTakeaways": ["…", "…", "…"],
    "faqs": [{ "question": "…?", "answer": "…" }],
    "sources": [{ "title": "…", "url": "https://…", "publisher": "…" }]
  },
  "en": { … same shape … }
}
`
}

// ---------------------------------------------------------------------------
// 3. Apply

export type ApplyResult = {
  applied: Array<{ slug: string; publishedAt: string; words: [number, number] }>
  rejected: string[]
}

export async function applyArticles(
  options: { dir?: string; from?: Date; verify?: boolean; fetcher?: typeof fetch } = {},
): Promise<ApplyResult> {
  const dir = options.dir ?? '.write'
  const out = path.join(dir, 'out')
  const applied = path.join(dir, 'applied')
  mkdirSync(applied, { recursive: true })
  const result: ApplyResult = { applied: [], rejected: [] }
  if (!existsSync(out)) return result
  const archive = loadArchive()
  const files = readdirSync(out)
    .filter((name) => name.endsWith('.json'))
    .sort()
  const slot = nextPublishSlots(options.from ?? new Date(), archive)

  for (const name of files) {
    const file = path.join(out, name)
    let article: ArticleFile
    try {
      const parsed = articleFileSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')))
      if (!parsed.success) {
        result.rejected.push(
          `${name}: ${parsed.error.issues
            .slice(0, 6)
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ')}`,
        )
        continue
      }
      article = parsed.data
    } catch (error) {
      result.rejected.push(`${name}: ${(error as Error).message}`)
      continue
    }
    if (archive.posts.some((post) => post.slug === article.slug)) {
      result.rejected.push(`${name}: slug "${article.slug}" already exists in the archive`)
      continue
    }
    if (!CATEGORIES.some((c) => c.slug === article.category)) {
      result.rejected.push(`${name}: unknown category "${article.category}"`)
      continue
    }
    if (!ALL_SERVICES.some((s) => s.slug === article.service)) {
      result.rejected.push(`${name}: unknown service "${article.service}"`)
      continue
    }
    const issues: string[] = []
    for (const locale of ['ar', 'en'] as const) {
      const inventory = archiveInventory(archive, [article.category], locale, article.service)
      const stripped = stripLinks(article[locale].body, inventory.allowed)
      article[locale].body = stripped.blocks
      if (stripped.removed.length)
        issues.push(
          `${locale}: removed links outside the inventory: ${stripped.removed.join(', ')}`,
        )
      const report = checkDraft(article[locale], {
        locale,
        keyword: article[locale].focusKeyword,
        allowedLinks: inventory.allowed,
        mustLink: `${locale === 'en' ? '/en' : ''}/services/${article.service}`,
      })
      issues.push(...report.issues.map((issue) => `${locale}: ${issue}`))
      if (options.verify !== false) {
        const { kept, dropped } = await verifySourcesOffline(
          article[locale].sources,
          options.fetcher,
        )
        article[locale].sources = kept
        if (dropped.length)
          issues.push(`${locale}: dropped source(s) that do not answer: ${dropped.join(', ')}`)
        if (kept.length === 0) issues.push(`${locale}: no source survived verification`)
      }
    }
    const blocking = issues.filter(
      (issue) => !issue.includes('removed links outside') && !issue.includes('dropped source'),
    )
    if (blocking.length) {
      result.rejected.push(`${name}:\n  ${blocking.join('\n  ')}`)
      continue
    }
    const publishedAt = slot.next()
    const post: ArchivePost = {
      slug: article.slug,
      publishedAt,
      status: 'published',
      categories: [article.category],
      service: article.service,
      cover: null,
      images: [],
      legacy: {},
      locales: {
        ar: localeDoc(article.ar),
        en: localeDoc(article.en),
      },
    }
    archive.posts.push(post)
    saveArchive(archive)
    renameSync(file, path.join(applied, name))
    result.applied.push({
      slug: article.slug,
      publishedAt,
      words: [post.locales.ar!.wordCount, post.locales.en!.wordCount],
    })
    if (issues.length)
      result.rejected.push(`${name} (applied with notes):\n  ${issues.join('\n  ')}`)
  }
  return result
}

function localeDoc(article: ArticleFile['ar']) {
  return {
    legacyId: '',
    title: article.title,
    excerpt: article.excerpt,
    seoDescription: article.seoDescription,
    focusKeyword: article.focusKeyword,
    body: blocksToLexical(article.body) as { root: Record<string, unknown> },
    wordCount: blocksWordCount(article.body),
    keyTakeaways: article.keyTakeaways,
    faqs: article.faqs,
    sources: article.sources,
    rewrittenAt: new Date().toISOString(),
    rewriteModel: 'editor-session',
  }
}

/** Best effort: a page that answers is kept, a 404 is dropped, a network failure keeps the source (this sandbox blocks many hosts). */
async function verifySourcesOffline(
  sources: ArticleFile['ar']['sources'],
  fetcher: typeof fetch = fetch,
): Promise<{ kept: ArticleFile['ar']['sources']; dropped: string[] }> {
  const kept: ArticleFile['ar']['sources'] = []
  const dropped: string[] = []
  for (const source of sources) {
    try {
      let response = await fetcher(source.url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(8_000),
      })
      if (response.status === 405 || response.status === 403) {
        response = await fetcher(source.url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(8_000),
        })
      }
      if (response.ok || response.status === 403) kept.push(source)
      else dropped.push(`${source.url} (${response.status})`)
    } catch {
      kept.push(source)
    }
  }
  return { kept, dropped }
}
