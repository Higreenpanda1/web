import { email as emailConfig, serverURL } from '@/lib/env'
import { getPayloadClient } from '@/lib/payload'

import type { Post, ResearchRun, Topic } from '@/payload-types'

/**
 * The weekly note to the owner: what the research found, what was queued,
 * what was written, what went live and what waits for a person. It is the
 * one place a non-technical owner sees the machine's week without opening
 * the CMS, and the reason "fully automated" does not mean "unwatched".
 *
 * Sent through the same Resend account as enquiry notifications, to the
 * same addresses (ENQUIRY_NOTIFY_TO). Silent when no provider is configured;
 * the text is still returned so `npm run posts:digest` can print it.
 */
export type DigestInput = {
  since: Date
  until: Date
  research: Pick<ResearchRun, 'ranAt' | 'summary' | 'report' | 'topicsAdded'> | null
  queued: Array<Pick<Topic, 'title' | 'keyword' | 'demandScore' | 'intent' | 'priority'>>
  drafted: Array<Pick<Post, 'slug' | 'title' | 'publishedAt' | '_status'>>
  live: Array<Pick<Post, 'slug' | 'title' | 'publishedAt'>>
  waiting: number
}

export async function collectDigest(days = 7): Promise<DigestInput> {
  const payload = await getPayloadClient()
  const until = new Date()
  const since = new Date(until.getTime() - days * 86_400_000)
  const sinceIso = since.toISOString()

  const [runs, queued, drafted, live, waiting] = await Promise.all([
    payload.find({ collection: 'research-runs', sort: '-ranAt', limit: 1, depth: 0 }),
    payload.find({
      collection: 'topics',
      where: { status: { equals: 'queued' } },
      locale: 'en',
      sort: 'priority',
      limit: 12,
      depth: 0,
    }),
    payload.find({
      collection: 'posts',
      // New this week: created in the period and either still a draft or
      // dated in it — an imported archive is created in one go but dated
      // years back, and is not "written this week".
      where: {
        createdAt: { greater_than_equal: sinceIso },
        or: [{ _status: { equals: 'draft' } }, { publishedAt: { greater_than_equal: sinceIso } }],
      },
      locale: 'ar',
      sort: '-createdAt',
      limit: 20,
      depth: 0,
      draft: true,
    }),
    payload.find({
      collection: 'posts',
      where: {
        _status: { equals: 'published' },
        publishedAt: { greater_than_equal: sinceIso, less_than_equal: until.toISOString() },
      },
      locale: 'ar',
      sort: '-publishedAt',
      limit: 20,
      depth: 0,
    }),
    payload.find({
      collection: 'topics',
      where: { status: { equals: 'drafted' } },
      limit: 0,
      depth: 0,
    }),
  ])
  const run = runs.docs[0]
  return {
    since,
    until,
    research: run && new Date(run.ranAt) >= since ? run : null,
    queued: queued.docs,
    drafted: drafted.docs,
    live: live.docs,
    waiting: waiting.totalDocs,
  }
}

export function digestText(input: DigestInput): { subject: string; text: string; html: string } {
  const period = `${input.since.toISOString().slice(0, 10)} to ${input.until.toISOString().slice(0, 10)}`
  const lines: string[] = []
  lines.push(`HiGreenPanda blog — the week of ${period}`, '')
  lines.push(
    `Went live: ${input.live.length}. Written: ${input.drafted.length}. Waiting for your review: ${input.waiting}. Queued for the coming weeks: ${input.queued.length}.`,
    '',
  )
  if (input.live.length) {
    lines.push('Went live this week')
    for (const post of input.live) lines.push(`- ${post.title} — ${serverURL}/blog/${post.slug}`)
    lines.push('')
  }
  if (input.drafted.length) {
    lines.push('Written this week')
    for (const post of input.drafted) {
      const state =
        post._status === 'published'
          ? `live from ${String(post.publishedAt).slice(0, 10)}`
          : 'draft — waiting for your review'
      lines.push(`- ${post.title} (${state}) — ${serverURL}/hgp-studio/collections/posts`)
    }
    lines.push('')
  }
  if (input.research) {
    lines.push(
      `Market research (${String(input.research.ranAt).slice(0, 10)})`,
      input.research.summary,
      '',
    )
    const notes = /## What the market says\n([\s\S]*?)\n\n## /.exec(
      input.research.report ?? '',
    )?.[1]
    if (notes) lines.push(notes.trim(), '')
  }
  if (input.queued.length) {
    lines.push('Next in the queue')
    for (const topic of input.queued.slice(0, 8)) {
      lines.push(
        `- ${topic.title} [${topic.keyword}]${typeof topic.demandScore === 'number' ? ` · demand ${topic.demandScore}` : ''}${topic.intent ? ` · ${topic.intent}` : ''}`,
      )
    }
    lines.push('')
  }
  lines.push(
    `Review drafts: ${serverURL}/hgp-studio/collections/posts?where[_status][equals]=draft`,
    `Content queue: ${serverURL}/hgp-studio/collections/topics`,
    `Research reports: ${serverURL}/hgp-studio/collections/research-runs`,
  )
  const text = lines.join('\n')
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.6;max-width:640px"><pre style="white-space:pre-wrap;font:inherit">${escapeHtml(text)}</pre></body></html>`
  return {
    subject: `Blog this week: ${input.live.length} live, ${input.drafted.length} written, ${input.waiting} waiting for review`,
    text,
    html,
  }
}

export async function sendWeeklyDigest(options: { dryRun?: boolean } = {}): Promise<string> {
  const input = await collectDigest(7)
  const message = digestText(input)
  if (options.dryRun) return message.text
  if (!emailConfig.configured || emailConfig.notifyTo.length === 0) {
    console.log('[digest] no email provider configured (RESEND_API_KEY); digest not sent')
    return message.text
  }
  const payload = await getPayloadClient()
  try {
    await payload.sendEmail({
      to: emailConfig.notifyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
    console.log(`[digest] sent to ${emailConfig.notifyTo.join(', ')}`)
  } catch (error) {
    console.error(`[digest] failed: ${(error as Error).message}`)
  }
  return message.text
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
