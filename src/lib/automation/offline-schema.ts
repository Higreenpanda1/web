import { z } from 'zod/v4'

import { articleSchema } from './blocks.ts'

import type { Archive } from './rewrite'

/**
 * The file shapes the offline pipeline reads and writes, and the publish-date
 * arithmetic — kept apart from offline.ts so they can be unit-tested without
 * loading the seed data or the SDK.
 */

export const topicFileSchema = z.object({
  marketNotes: z.string().min(80).max(2000),
  topics: z
    .array(
      z.object({
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(80),
        ar: z.object({
          title: z.string().min(15).max(130),
          keyword: z.string().min(4).max(80),
          brief: z.string().min(120).max(2500),
        }),
        en: z.object({
          title: z.string().min(15).max(130),
          keyword: z.string().min(4).max(80),
          brief: z.string().min(120).max(2500),
        }),
        category: z.string(),
        intent: z.enum(['informational', 'commercial', 'transactional']),
        audience: z.string().min(10).max(120),
        service: z.string(),
        demandScore: z.number().int().min(0).max(100),
        seasonalHook: z.string().max(160).optional(),
        source: z.enum(['research', 'trend']).default('research'),
        evidence: z.string().min(20).max(2500),
        rationale: z.string().min(20).max(500),
      }),
    )
    .min(1)
    .max(14),
})
export type TopicFile = z.infer<typeof topicFileSchema>

const sourceSchema = z.object({
  title: z.string().min(3).max(200),
  url: z.string().url().max(500),
  publisher: z.string().max(120).optional(),
})
const localeArticleSchema = articleSchema.extend({ sources: z.array(sourceSchema).min(1).max(6) })
export const articleFileSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string(),
  service: z.string(),
  ar: localeArticleSchema,
  en: localeArticleSchema,
})
export type ArticleFile = z.infer<typeof articleFileSchema>

/**
 * Publish dates: 09:00 Riyadh (06:00 UTC) on the next Sunday, Tuesday and
 * Thursday that are free — after any date the archive already holds in the
 * future, so two runs in a row keep spacing the articles out.
 */
export function nextPublishSlots(
  from: Date,
  archive: Pick<Archive, 'posts'>,
): { next: () => string } {
  const taken = new Set(archive.posts.map((post) => post.publishedAt.slice(0, 10)))
  const latest = archive.posts
    .map((post) => post.publishedAt)
    .filter((date) => date > from.toISOString())
    .sort()
    .at(-1)
  const cursor = new Date(Math.max(from.getTime(), latest ? new Date(latest).getTime() : 0))
  cursor.setUTCHours(6, 0, 0, 0)
  const days = new Set([0, 2, 4])
  return {
    next: () => {
      do {
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      } while (!days.has(cursor.getUTCDay()) || taken.has(cursor.toISOString().slice(0, 10)))
      taken.add(cursor.toISOString().slice(0, 10))
      return cursor.toISOString()
    },
  }
}
