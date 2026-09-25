import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
// zod 3.25 ships the v4 API under this path; the SDK's helper is typed against it.
import { z } from 'zod/v4'

import { lexicalToPlainText } from '@/lib/lexical'
import { getPayloadClient } from '@/lib/payload'

import { articleSchema, blocksToLexical, type ArticleDraft } from './blocks'
import { autopublishConfig, chinaWeekday, draftWeekdays, researchWeekday } from './cadence'
import { MODEL, anthropic, contentJobsEnabled } from './claude'
import { checkDraft, stripLinks, type QualityReport } from './quality'
import { VOICE } from './voice'

import type { Post, Service, Topic } from '@/payload-types'

/**
 * The content jobs, all driven by Claude:
 *
 *   enrichPosts      — for published articles with no key takeaways or
 *                      questions, write both from the article's own text.
 *                      These go live directly: they add no claims the article
 *                      does not already make, and the article is already live.
 *   translateMissing — for Arabic-only articles, write the English version as
 *                      a draft of the same document (the article stays live in
 *                      Arabic; `localesAvailable` gains "en" only when an editor
 *                      publishes the English).
 *   draftFromQueue   — take the highest-priority queued topic and write a
 *                      bilingual article: Arabic first, English from the Arabic,
 *                      with a direct answer up front, figures with sources,
 *                      internal links from an inventory of real pages, the
 *                      service it sells, takeaways, questions, excerpt and meta
 *                      description. Saved as a draft — or, with
 *                      BLOG_AUTOPUBLISH=true and the quality gate passed in
 *                      both languages, published with a publish date a couple
 *                      of days out so the owner has a window to read it first.
 *
 * `runContentJobs` is the daily bundle the scheduler runs: enrichment and
 * translation every day, market research on its weekday, drafts on theirs.
 */

export { contentJobsEnabled, VOICE }

const takeawaysSchema = z.object({
  keyTakeaways: z
    .array(z.string().min(20).max(220))
    .min(3)
    .max(5)
    .describe(
      'One-sentence, actionable statements a reader could quote. Same language as the article.',
    ),
  faqs: z
    .array(
      z.object({
        question: z
          .string()
          .min(10)
          .max(200)
          .describe('A real search query, phrased as a question.'),
        answer: z
          .string()
          .min(60)
          .max(700)
          .describe('Two or three sentences that answer directly.'),
      }),
    )
    .min(3)
    .max(5),
  focusKeyword: z
    .string()
    .min(3)
    .max(120)
    .describe('The single search phrase this article should rank for.'),
})

const translationSchema = articleSchema

const sourceSchema = z.object({
  title: z.string().min(3).max(200).describe('What the source is, e.g. "ZATCA customs tariff".'),
  url: z.string().url().max(500).describe('A real page on the organisation’s own domain.'),
  publisher: z.string().max(120).optional().describe('The organisation.'),
})

/** A new article: the article shape plus the sources its figures rest on. */
const draftSchema = articleSchema.extend({
  sources: z
    .array(sourceSchema)
    .min(1)
    .max(6)
    .describe(
      'Where the figures come from. Official bodies and primary sources only; when unsure of the exact page, give the organisation’s homepage.',
    ),
})
export type NewArticle = z.infer<typeof draftSchema>

/** The daily bundle the scheduler runs. Each job is independent. */
export async function runContentJobs(): Promise<void> {
  if (!contentJobsEnabled()) return
  const batch = Number(process.env.ENRICH_BATCH ?? '3') || 3
  await guarded('enrich', () => enrichPosts(batch))
  await guarded('translate', () => translateMissing(1))

  const weekday = chinaWeekday()
  if (weekday === researchWeekday()) {
    await guarded('research', async () => {
      const { researchTopics } = await import('./research/plan')
      await researchTopics()
    })
  }
  if (draftWeekdays().includes(weekday)) {
    await guarded('draft', () => draftFromQueue())
  }
  if (weekday === researchWeekday()) {
    await guarded('digest', async () => {
      const { sendWeeklyDigest } = await import('./digest')
      await sendWeeklyDigest()
    })
  }
}

async function guarded(name: string, job: () => Promise<unknown>): Promise<void> {
  try {
    await job()
  } catch (error) {
    console.error(`[${name}] failed: ${(error as Error).message}`)
  }
}

// ---------------------------------------------------------------------------

export async function enrichPosts(limit = 3): Promise<number> {
  const payload = await getPayloadClient()
  let done = 0

  for (const locale of ['ar', 'en'] as const) {
    if (done >= limit) break
    const candidates = await payload.find({
      collection: 'posts',
      where: {
        _status: { equals: 'published' },
        ...(locale === 'en' ? { localesAvailable: { contains: 'en' } } : {}),
      },
      locale,
      depth: 0,
      limit: 50,
      sort: '-publishedAt',
    })
    for (const post of candidates.docs) {
      if (done >= limit) break
      if ((post.keyTakeaways?.length ?? 0) > 0 && (post.faqs?.length ?? 0) > 0) continue
      const text = lexicalToPlainText(post.body)
      if (text.split(/\s+/).length < 120) continue

      console.log(`[enrich] ${locale} ${post.slug}`)
      const response = await anthropic().messages.parse({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: { format: zodOutputFormat(takeawaysSchema), effort: 'medium' },
        system: VOICE,
        messages: [
          {
            role: 'user',
            content: `Language of this article: ${locale === 'ar' ? 'Arabic' : 'English'}. Write the key takeaways, the questions this article answers (with direct answers drawn only from the article), and its focus keyword, in the same language.\n\nTitle: ${post.title}\n\n${text.slice(0, 40_000)}`,
          },
        ],
      })
      if (response.stop_reason === 'refusal' || !response.parsed_output) {
        console.warn(`[enrich] no usable answer for ${post.slug} (${response.stop_reason})`)
        continue
      }
      const out = response.parsed_output
      await payload.update({
        collection: 'posts',
        id: post.id,
        locale,
        depth: 0,
        data: {
          ...(post.keyTakeaways?.length
            ? {}
            : { keyTakeaways: out.keyTakeaways.map((text) => ({ text })) }),
          ...(post.faqs?.length ? {} : { faqs: out.faqs }),
          ...(post.focusKeyword ? {} : { focusKeyword: out.focusKeyword }),
        },
      })
      done++
    }
  }
  if (done) console.log(`[enrich] enriched ${done} article(s)`)
  return done
}

// ---------------------------------------------------------------------------

export async function translateMissing(limit = 1): Promise<number> {
  const payload = await getPayloadClient()
  const candidates = await payload.find({
    collection: 'posts',
    where: { _status: { equals: 'published' }, localesAvailable: { not_in: ['en'] } },
    locale: 'ar',
    depth: 0,
    limit: 20,
    sort: '-publishedAt',
  })
  let done = 0
  for (const post of candidates.docs) {
    if (done >= limit) break
    if ((post.localesAvailable ?? []).includes('en')) continue
    // Already translated and waiting for review: the English title differs from the Arabic.
    const english = await payload.findByID({
      collection: 'posts',
      id: post.id,
      locale: 'en',
      depth: 0,
      draft: true,
      fallbackLocale: false,
    })
    if (english.title && english.title !== post.title) continue

    const text = lexicalToPlainText(post.body)
    if (text.split(/\s+/).length < 120) continue
    console.log(`[translate] ${post.slug}`)

    const response = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 24000,
      thinking: { type: 'adaptive' },
      output_config: { format: zodOutputFormat(translationSchema), effort: 'high' },
      system: VOICE,
      messages: [
        {
          role: 'user',
          content: `Translate this Arabic article into English for the same audience. Keep every figure, step and caveat. Keep the structure (headings, lists). British spelling. Return the full English article as structured blocks, plus an excerpt, a meta description, the focus keyword, key takeaways and questions with answers — all in English.\n\nTitle: ${post.title}\n\nExcerpt: ${post.excerpt}\n\n${text.slice(0, 60_000)}`,
        },
      ],
    })
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      console.warn(`[translate] no usable answer for ${post.slug} (${response.stop_reason})`)
      continue
    }
    const draft = response.parsed_output
    // Saved as a draft version of the English locale. The Arabic stays live;
    // `localesAvailable` is the editor's switch once the English is checked.
    await payload.update({
      collection: 'posts',
      id: post.id,
      locale: 'en',
      depth: 0,
      draft: true,
      data: {
        title: draft.title,
        excerpt: draft.excerpt,
        body: blocksToLexical(draft.body),
        focusKeyword: draft.focusKeyword,
        seo: { description: draft.seoDescription },
        keyTakeaways: draft.keyTakeaways.map((item) => ({ text: item })),
        faqs: draft.faqs,
        _status: 'draft',
      } as never,
    })
    done++
  }
  if (done)
    console.log(
      `[translate] drafted English for ${done} article(s) — review in the CMS, then add "English" to Languages available and publish`,
    )
  return done
}

// ---------------------------------------------------------------------------

export type DraftOutcome = {
  post: Post
  slug: string
  title: string
  published: boolean
  publishedAt: string | null
  quality: { ar: QualityReport; en: QualityReport | null }
  service: string | null
}

export async function draftFromQueue(
  options: { dryRun?: boolean } = {},
): Promise<DraftOutcome | null> {
  const payload = await getPayloadClient()
  const now = new Date().toISOString()
  const queue = await payload.find({
    collection: 'topics',
    where: {
      status: { equals: 'queued' },
      or: [{ scheduledFor: { exists: false } }, { scheduledFor: { less_than_equal: now } }],
    },
    locale: 'ar',
    depth: 1,
    limit: 1,
    sort: 'priority',
  })
  const topic = queue.docs[0] as Topic | undefined
  if (!topic) {
    console.log('[draft] the content queue is empty')
    return null
  }
  const topicEn = await payload.findByID({
    collection: 'topics',
    id: topic.id,
    locale: 'en',
    depth: 0,
  })
  const category = typeof topic.category === 'object' ? topic.category : null
  const service =
    typeof topic.targetService === 'object' && topic.targetService
      ? (topic.targetService as Service)
      : await fallbackService(payload, category?.slug ?? null)
  console.log(`[draft] writing: ${topic.title}${service ? ` (→ ${service.slug})` : ''}`)

  const inventoryAr = await linkInventory(payload, 'ar', category?.id ?? null, service)
  const inventoryEn = await linkInventory(payload, 'en', category?.id ?? null, service)

  const arabic = await writeArticle({
    language: 'Arabic',
    title: topic.title,
    keyword: topic.keyword,
    brief: topic.brief ?? '',
    audience: topic.audience ?? '',
    categoryName: category?.title ?? '',
    service: service
      ? { path: `/services/${service.slug}`, name: inventoryAr.serviceTitle ?? service.title }
      : null,
    inventory: inventoryAr,
  })
  if (!arabic) return null
  const english = await writeArticle({
    language: 'English',
    title: topicEn.title || topic.title,
    keyword: topicEn.keyword || topic.keyword,
    brief: topicEn.brief ?? topic.brief ?? '',
    audience: topic.audience ?? '',
    categoryName: category?.title ?? '',
    service: service
      ? { path: `/en/services/${service.slug}`, name: inventoryEn.serviceTitle ?? service.title }
      : null,
    inventory: inventoryEn,
    translateFrom: arabic,
  })

  // Links outside the inventory are removed rather than published broken.
  const ar = stripLinks(arabic.body, inventoryAr.allowed)
  arabic.body = ar.blocks
  if (ar.removed.length)
    console.warn(`[draft] removed ${ar.removed.length} unknown link(s) from the Arabic`)
  if (english) {
    const en = stripLinks(english.body, inventoryEn.allowed)
    english.body = en.blocks
    if (en.removed.length)
      console.warn(`[draft] removed ${en.removed.length} unknown link(s) from the English`)
  }

  const quality = {
    ar: checkDraft(arabic, {
      locale: 'ar',
      keyword: topic.keyword,
      allowedLinks: inventoryAr.allowed,
      mustLink: service ? `/services/${service.slug}` : null,
    }),
    en: english
      ? checkDraft(english, {
          locale: 'en',
          keyword: topicEn.keyword || topic.keyword,
          allowedLinks: inventoryEn.allowed,
          mustLink: service ? `/en/services/${service.slug}` : null,
        })
      : null,
  }
  // Sources the web cannot find are dropped: an article that cites a page
  // that does not exist is worse than one with one citation fewer.
  arabic.sources = await verifySources(arabic.sources)
  if (english) english.sources = await verifySources(english.sources)

  const autopublish = autopublishConfig()
  const passes = quality.ar.ok && (english === null || quality.en?.ok === true) && english !== null
  const publish = autopublish.enabled && passes
  const publishedAt = new Date(
    Date.now() + (publish ? autopublish.delayHours : 24 * 7) * 3_600_000,
  ).toISOString()
  const issues = [
    ...quality.ar.issues.map((issue) => `ar: ${issue}`),
    ...(quality.en?.issues ?? []).map((issue) => `en: ${issue}`),
    ...(english ? [] : ['en: no English version was produced']),
  ]

  const slug = slugify(topicEn.title || english?.title || arabic.title) || `article-${Date.now()}`
  const existing = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    draft: true,
  })
  const finalSlug = existing.docs.length ? `${slug}-${new Date().getFullYear()}` : slug

  if (options.dryRun) {
    console.log(
      `[draft] dry run: "${arabic.title}" → /blog/${finalSlug}, ${quality.ar.words}/${quality.en?.words ?? 0} words, ${publish ? 'would publish' : 'would save as draft'}${issues.length ? `\n  ${issues.join('\n  ')}` : ''}`,
    )
    return null
  }

  const founder = await payload.find({
    collection: 'team-members',
    where: { isFounder: { equals: true } },
    limit: 1,
    depth: 0,
  })

  const status = publish ? 'published' : 'draft'
  const post = await payload.create({
    collection: 'posts',
    locale: 'ar',
    draft: !publish,
    depth: 0,
    data: {
      slug: finalSlug,
      title: arabic.title,
      excerpt: arabic.excerpt,
      body: blocksToLexical(arabic.body),
      keyTakeaways: arabic.keyTakeaways.map((text) => ({ text })),
      faqs: arabic.faqs,
      sources: arabic.sources,
      focusKeyword: arabic.focusKeyword,
      seo: { description: arabic.seoDescription },
      publishedAt,
      author: founder.docs[0]?.id,
      categories: category ? [category.id] : [],
      ctaService: service?.id,
      localesAvailable: english ? ['ar', 'en'] : ['ar'],
      _status: status,
    } as never,
  })
  if (english) {
    await payload.update({
      collection: 'posts',
      id: post.id,
      locale: 'en',
      draft: !publish,
      depth: 0,
      data: {
        title: english.title,
        excerpt: english.excerpt,
        body: blocksToLexical(english.body),
        keyTakeaways: english.keyTakeaways.map((text) => ({ text })),
        faqs: english.faqs,
        sources: english.sources,
        focusKeyword: english.focusKeyword,
        seo: { description: english.seoDescription },
        _status: status,
      } as never,
    })
  }
  await payload.update({
    collection: 'topics',
    id: topic.id,
    depth: 0,
    data: {
      status: publish ? 'published' : 'drafted',
      post: post.id,
      notes: [
        topic.notes,
        `${new Date().toISOString().slice(0, 10)}: ${publish ? `published, live from ${publishedAt.slice(0, 16).replace('T', ' ')} UTC` : 'saved as a draft for review'}. Quality: Arabic ${quality.ar.words} words, ${quality.ar.links} links; English ${quality.en?.words ?? 0} words, ${quality.en?.links ?? 0} links.${issues.length ? `\nIssues:\n- ${issues.join('\n- ')}` : ''}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
  })
  console.log(
    publish
      ? `[draft] published "${arabic.title}" (/blog/${finalSlug}) — live from ${publishedAt}; it is announced then`
      : `[draft] saved draft "${arabic.title}" (/blog/${finalSlug}) — review and publish in the CMS${issues.length ? `\n  ${issues.join('\n  ')}` : ''}`,
  )
  return {
    post: post as Post,
    slug: finalSlug,
    title: arabic.title,
    published: publish,
    publishedAt: publish ? publishedAt : null,
    quality,
    service: service?.slug ?? null,
  }
}

// ---------------------------------------------------------------------------

export type LinkInventory = { text: string; allowed: Set<string>; serviceTitle: string | null }

/** Pages this article may link to: same-category articles, then every service, then the consultation form. */
export async function linkInventory(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  locale: 'ar' | 'en',
  categoryId: number | null,
  service: Service | null,
): Promise<LinkInventory> {
  const prefix = locale === 'en' ? '/en' : ''
  const [related, others, services] = await Promise.all([
    categoryId
      ? payload.find({
          collection: 'posts',
          where: {
            _status: { equals: 'published' },
            categories: { contains: categoryId },
            ...(locale === 'en' ? { localesAvailable: { contains: 'en' } } : {}),
          },
          locale,
          depth: 0,
          limit: 10,
          sort: '-publishedAt',
          select: { slug: true, title: true },
        })
      : Promise.resolve({ docs: [] as Array<{ slug: string; title: string }> }),
    payload.find({
      collection: 'posts',
      where: {
        _status: { equals: 'published' },
        ...(locale === 'en' ? { localesAvailable: { contains: 'en' } } : {}),
      },
      locale,
      depth: 0,
      limit: 8,
      sort: '-publishedAt',
      select: { slug: true, title: true },
    }),
    payload.find({
      collection: 'services',
      where: { _status: { equals: 'published' } },
      locale,
      depth: 0,
      limit: 50,
      sort: 'order',
      select: { slug: true, title: true },
    }),
  ])
  const seen = new Set<string>()
  const lines: string[] = []
  const add = (path: string, title: string, note = '') => {
    if (seen.has(path)) return
    seen.add(path)
    lines.push(`- ${path} — ${title}${note}`)
  }
  // The topic's service came back in the topic's locale; the inventory is
  // built per language, so its title is taken from this locale's list.
  const serviceTitle = service
    ? (services.docs.find((entry) => entry.slug === service.slug)?.title ?? service.title)
    : null
  for (const post of [...related.docs, ...others.docs])
    add(`${prefix}/blog/${post.slug}`, post.title)
  if (service && serviceTitle) {
    add(`${prefix}/services/${service.slug}`, serviceTitle, ' (the service this article leads to)')
  }
  for (const entry of services.docs)
    add(`${prefix}/services/${entry.slug}`, entry.title, ' (service page)')
  add(`${prefix}/apply/consultation`, locale === 'ar' ? 'حجز استشارة' : 'Book a consultation')
  return { text: lines.join('\n'), allowed: seen, serviceTitle }
}

async function fallbackService(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  categorySlug: string | null,
): Promise<Service | null> {
  // The blog category → the service most readers of it need.
  const map: Record<string, string> = {
    importing: 'full-import-management',
    'suppliers-sourcing': 'product-sourcing',
    'shipping-logistics': 'shipping-and-freight',
    'quality-inspection': 'quality-inspection',
    'company-setup': 'company-formation',
    'trade-fairs': 'trade-fair-support',
    ecommerce: 'ecommerce-launch',
    investment: 'business-consulting',
    industries: 'product-sourcing',
    'legal-compliance': 'trademark-registration',
    'business-culture': 'business-consulting',
    'economy-belt-road': 'business-consulting',
  }
  const slug = (categorySlug && map[categorySlug]) || 'business-consulting'
  const found = await payload.find({
    collection: 'services',
    where: { slug: { equals: slug }, _status: { equals: 'published' } },
    locale: 'en',
    depth: 0,
    limit: 1,
  })
  return (found.docs[0] as Service | undefined) ?? null
}

/** Keep only sources whose page answers; a citation that 404s is worse than none. */
export async function verifySources(
  sources: NewArticle['sources'],
  fetcher: typeof fetch = fetch,
): Promise<NewArticle['sources']> {
  const kept: NewArticle['sources'] = []
  for (const source of sources) {
    if (!/^https:\/\//.test(source.url)) continue
    try {
      let response = await fetcher(source.url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(8_000),
        headers: { 'User-Agent': 'HiGreenPandaBot/1.0 (+https://higreenpanda.com)' },
      })
      if (response.status === 405 || response.status === 403) {
        response = await fetcher(source.url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(8_000),
          headers: { 'User-Agent': 'HiGreenPandaBot/1.0 (+https://higreenpanda.com)' },
        })
      }
      if (response.ok) kept.push(source)
      else console.warn(`[draft] dropped source ${source.url} (status ${response.status})`)
    } catch (error) {
      console.warn(`[draft] dropped source ${source.url} (${(error as Error).message})`)
    }
  }
  return kept
}

async function writeArticle(args: {
  language: 'Arabic' | 'English'
  title: string
  keyword: string
  brief: string
  audience: string
  categoryName: string
  service: { path: string; name: string } | null
  inventory: LinkInventory
  translateFrom?: NewArticle
}): Promise<NewArticle | null> {
  const linkRules = `Internal links: use the exact syntax [anchor text](path) with paths from the inventory below and nothing else. Place 3 to 6 links, each URL at most once, only where the linked page genuinely helps at that point. At least two links to other articles.${args.service ? ` Exactly one link to ${args.service.path} (${args.service.name}), in the closing section, phrased as what the reader can hand over, not as an advert.` : ''} Never invent a path.
Inline markup allowed: [anchor](path) for links and **bold** for a key phrase. Nothing else — no HTML, no markdown headings inside text, no tables.

Link inventory (the only paths you may use):
${args.inventory.text}`

  const instruction = args.translateFrom
    ? `Write the English version of the Arabic article below, for the same audience. It is a faithful rendering, not a new article: same structure, same figures, same caveats, same sources. British spelling. Target search phrase in English: "${args.keyword}" — it must appear in the title, the first paragraph and the meta description.

${linkRules}

Arabic article (JSON):
${JSON.stringify(args.translateFrom)}`
    : `Write a complete blog article in ${args.language}, 1,200 to 1,800 words, for the category "${args.categoryName}".

Working title: ${args.title}
Target search phrase (must appear in the title, the first paragraph, one heading and the meta description, naturally): ${args.keyword}
Reader: ${args.audience || 'an Arabic-speaking importer or entrepreneur in the Gulf or Yemen'}
Brief from the editor: ${args.brief}

Structure, in this order:
1. A first paragraph of 40 to 70 words that answers the question in the title directly, with the key figure or the key step — the sentences an assistant would quote. No preamble.
2. Four to seven H2 sections, some with H3s. Phrase at least three H2s as the questions people ask. Include one numbered step list, one checklist, one comparison as a list (options, and what each costs or takes), and a "common mistakes" section.
3. At least three concrete figures with their year and their source in the text (a duty rate, a fee, a lead time, a price range). Where a figure changes often, give the range and say what to check and where.
4. A closing "what to do next" section: three actions the reader can take this week, then one sentence that says what HiGreenPanda can take off their hands.

${linkRules}

Then the excerpt (one or two sentences), the meta description (under 158 characters, contains the search phrase), the focus keyword, three to five key takeaways, three to six questions with answers (real search queries, direct answers), and the sources: 2 to 5 official or primary pages the figures come from (customs authorities, ministries, standards bodies, port authorities, the fair's organiser, statistics offices). Use a page on the organisation's own domain; if you are not sure of the exact page, give the organisation's homepage. Never invent a URL.`

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: { format: zodOutputFormat(draftSchema), effort: 'high' },
    system: VOICE,
    messages: [{ role: 'user', content: instruction }],
  })
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    console.warn(`[draft] no usable answer (${response.stop_reason})`)
    return null
  }
  return response.parsed_output
}

// ---------------------------------------------------------------------------

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export type { ArticleDraft }
