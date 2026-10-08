import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { FOUNDER } from '../seed/content'

/**
 * Data only, no schema change. Brings the founder record the owner edits in
 * the CMS up to the wording he approved on 8 October 2026: the bachelor's and
 * master's as two lines, the title Founder & CEO, China Baowu and the Baowu–Aramco project, the
 * Harvard Kennedy School course, the Al Jazeera course and his languages.
 *
 * The Baowu sentence goes into the bio after the Belt and Road sentence; the
 * rest of the bio stays as it is in the CMS. A record that already mentions
 * Baowu is left alone, so running this twice changes nothing.
 */
const BIO_SENTENCE = {
  ar: 'عمل في مجموعة الصين باوو، أكبر مجموعة للحديد والصلب في العالم وإحدى شركات فورتشن غلوبال 500، وشارك في إدارة مشروع صيني سعودي مشترك بين باوو وأرامكو.',
  en: 'He worked at China Baowu Group, the world’s largest steel group and a Fortune Global 500 company, and helped manage a Chinese-Saudi joint project between Baowu and Aramco.',
} as const

/** The sentence the Baowu line follows. */
const AFTER = { ar: 'المنطقة العربية.', en: 'Arab region.' } as const

const insertSentence = (bio: string, locale: 'ar' | 'en') => {
  const at = bio.indexOf(AFTER[locale])
  if (at === -1) return `${bio} ${BIO_SENTENCE[locale]}`.trim()
  const end = at + AFTER[locale].length
  return `${bio.slice(0, end)} ${BIO_SENTENCE[locale]}${bio.slice(end)}`
}

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const { docs } = await payload.find({
    collection: 'team-members',
    where: { isFounder: { equals: true } },
    limit: 1,
    depth: 0,
    req,
  })
  const founder = docs[0]
  if (!founder) return

  for (const locale of ['ar', 'en'] as const) {
    const current = await payload.findByID({
      collection: 'team-members',
      id: founder.id,
      locale,
      fallbackLocale: false,
      depth: 0,
      req,
    })
    const bio = current.bio ?? ''
    const done = (text: string) => text.includes('Baowu') || text.includes('باوو')
    const bioDone = done(bio)
    const credentialsDone = (current.credentials ?? []).some((item) => done(item.text))
    // Only the untouched default title is replaced.
    const roleDone = current.role !== (locale === 'ar' ? 'المؤسس' : 'Founder')
    if (bioDone && credentialsDone && roleDone) continue

    await payload.update({
      collection: 'team-members',
      id: founder.id,
      locale,
      depth: 0,
      req,
      data: {
        ...(roleDone ? {} : { role: FOUNDER[locale].role }),
        ...(bioDone ? {} : { bio: bio ? insertSentence(bio, locale) : FOUNDER[locale].bio }),
        ...(credentialsDone
          ? {}
          : { credentials: FOUNDER[locale].credentials.map((text) => ({ text })) }),
      },
    })
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Content, not schema: the owner edits these lines in the CMS if needed.
}
