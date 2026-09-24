import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
// zod 3.25 ships the v4 API under this path; the SDK's helper is typed against it.
import { z } from 'zod/v4'

import { lexicalToPlainText } from '@/lib/lexical'
import { getPayloadClient } from '@/lib/payload'

import { articleSchema, blocksToLexical, type ArticleDraft } from './blocks'

import type { Post, Topic } from '@/payload-types'

/**
 * The content jobs, all driven by Claude and all producing work for a person
 * to review rather than pages that go live on their own:
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
 *                      bilingual draft: Arabic first, English from the Arabic,
 *                      with takeaways, questions, an excerpt and a meta
 *                      description. Saved as a draft; the topic is marked
 *                      "drafted" and linked to it.
 *
 * Voice rules come from WEBSITE-BRIEF.md section 10 and BUILD-PROMPT.md and
 * are repeated to the model verbatim: second person, plain, concrete figures,
 * no exclamation marks, no emoji, no invented guarantees or prices.
 *
 * Model: `claude-opus-5` unless ANTHROPIC_MODEL says otherwise. Every call uses
 * adaptive thinking and a structured output schema, so a malformed answer is a
 * parse error we log, never half a document saved.
 */

const MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-opus-5'

export const VOICE = `You write for HiGreenPanda (هاي جرين باندا), a China trade-services firm in Shenzhen and Shanghai serving Arabic-speaking importers and entrepreneurs in the Gulf, Yemen and the wider Arab world. Services: product sourcing, manufacturing, quality inspection, shipping, company formation in China, e-commerce launch support, trade-fair accompaniment.

Voice rules, all binding:
- Arabic is the primary voice. Write natural Modern Standard Arabic as a Gulf trader reads it; never Arabic that feels translated from English.
- Speak to one reader in the second person. Lead with the reader's problem.
- Short sentences. Concrete nouns. Real figures with their unit (days, USD, CNY, percent, container sizes, MOQ). Where a figure varies, give a range and say what moves it.
- Never use "cheap". Never promise a guarantee the firm cannot enforce. Never invent prices, laws or statistics you are not confident about; if unsure, say what to check and where.
- No exclamation marks, in either language. No emoji. No marketing adjectives.
- Western numerals (1234) in both languages.
- Headings are questions or plain statements, never clickbait.`

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

let client: Anthropic | null = null
function anthropic(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

export function contentJobsEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

/** The daily bundle the scheduler runs. Each job is independent. */
export async function runContentJobs(): Promise<void> {
  if (!contentJobsEnabled()) return
  const batch = Number(process.env.ENRICH_BATCH ?? '3') || 3
  await enrichPosts(batch)
  await translateMissing(1)
  const weekday = Number(process.env.DRAFT_WEEKDAY ?? '1')
  if (chinaWeekday() === weekday) await draftFromQueue()
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

export async function draftFromQueue(): Promise<Post | null> {
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
  console.log(`[draft] writing: ${topic.title}`)

  const arabic = await writeArticle({
    language: 'Arabic',
    title: topic.title,
    keyword: topic.keyword,
    brief: topic.brief ?? '',
    categoryName: category?.title ?? '',
  })
  if (!arabic) return null

  const english = await writeArticle({
    language: 'English',
    title: topicEn.title || topic.title,
    keyword: topicEn.keyword || topic.keyword,
    brief: topicEn.brief ?? topic.brief ?? '',
    categoryName: category?.title ?? '',
    translateFrom: arabic,
  })

  const slug = slugify(topicEn.title || arabic.title) || `article-${Date.now()}`
  const existing = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    draft: true,
  })
  const finalSlug = existing.docs.length ? `${slug}-${new Date().getFullYear()}` : slug

  const founder = await payload.find({
    collection: 'team-members',
    where: { isFounder: { equals: true } },
    limit: 1,
    depth: 0,
  })

  const post = await payload.create({
    collection: 'posts',
    locale: 'ar',
    draft: true,
    depth: 0,
    data: {
      slug: finalSlug,
      title: arabic.title,
      excerpt: arabic.excerpt,
      body: blocksToLexical(arabic.body),
      keyTakeaways: arabic.keyTakeaways.map((text) => ({ text })),
      faqs: arabic.faqs,
      focusKeyword: arabic.focusKeyword,
      seo: { description: arabic.seoDescription },
      publishedAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      author: founder.docs[0]?.id,
      categories: category ? [category.id] : [],
      localesAvailable: english ? ['ar', 'en'] : ['ar'],
      _status: 'draft',
    } as never,
  })
  if (english) {
    await payload.update({
      collection: 'posts',
      id: post.id,
      locale: 'en',
      draft: true,
      depth: 0,
      data: {
        title: english.title,
        excerpt: english.excerpt,
        body: blocksToLexical(english.body),
        keyTakeaways: english.keyTakeaways.map((text) => ({ text })),
        faqs: english.faqs,
        focusKeyword: english.focusKeyword,
        seo: { description: english.seoDescription },
        _status: 'draft',
      } as never,
    })
  }
  await payload.update({
    collection: 'topics',
    id: topic.id,
    depth: 0,
    data: { status: 'drafted', post: post.id },
  })
  console.log(
    `[draft] saved draft "${arabic.title}" (/blog/${finalSlug}) — review and publish in the CMS`,
  )
  return post as Post
}

async function writeArticle(args: {
  language: 'Arabic' | 'English'
  title: string
  keyword: string
  brief: string
  categoryName: string
  translateFrom?: ArticleDraft
}): Promise<ArticleDraft | null> {
  const instruction = args.translateFrom
    ? `Write the English version of the Arabic article below, for the same audience. It is a faithful rendering, not a new article: same structure, same figures, same caveats. British spelling. Target search phrase in English: "${args.keyword}".\n\nArabic article (JSON):\n${JSON.stringify(args.translateFrom)}`
    : `Write a complete blog article in ${args.language}, 1,100 to 1,600 words, for the category "${args.categoryName}".\n\nWorking title: ${args.title}\nTarget search phrase (must appear in the title, the first paragraph and one heading, naturally): ${args.keyword}\nBrief from the editor: ${args.brief}\n\nStructure: an opening paragraph that states the reader's problem and what they will know by the end; four to seven H2 sections, some with H3s; at least one numbered step list and one checklist; a closing section that says what to do next (without selling — one sentence may mention that HiGreenPanda does this on the ground). Then the excerpt (one or two sentences), the meta description (under 158 characters, contains the search phrase), the focus keyword, three to five key takeaways and three to five questions with answers.`

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: { format: zodOutputFormat(translationSchema), effort: 'high' },
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

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function chinaWeekday(): number {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
  }).format(new Date())
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name)
}
