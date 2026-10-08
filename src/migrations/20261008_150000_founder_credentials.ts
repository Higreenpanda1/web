import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Data only, no schema change. Adds the founder's Baowu years, the Baowu and
 * Aramco project, the Harvard leadership certificate and his other awards to
 * the founder record the owner already edits in the CMS. It appends rather
 * than replaces, and skips any line already there, so CMS edits survive and
 * running it twice changes nothing.
 */
const ADDITIONS = {
  ar: {
    bio: 'عمل في شركة باوستيل التابعة لمجموعة الصين باوو، أكبر مجموعة للحديد والصلب في العالم، وشارك في مشروع مشترك بين باوو وأرامكو السعودية.',
    credentials: [
      'عمل في باوستيل (Baosteel) التابعة لمجموعة الصين باوو، أكبر مجموعة للحديد والصلب في العالم وإحدى شركات فورتشن غلوبال 500',
      'شارك في مشروع مشترك بين مجموعة باوو وأرامكو السعودية',
      'شهادة في القيادة من جامعة هارفارد (HarvardX)',
      'منحة حكومة جيانغسو، المركز الأول (2020)',
      'المركز الأول في اللغة الصينية وجائزة التميّز الأكاديمي، جامعة وسط الصين للمعلمين (2016)',
      'شهادة تدريس اللغة الإنجليزية TESOL (120 ساعة)',
      'دورة صناعة المحتوى من Nas Academy (2021)',
      'يتحدث العربية والصينية والإنجليزية',
    ],
  },
  en: {
    bio: 'He worked at Baosteel, part of China Baowu Group, the world’s largest steel group, and on a joint project between Baowu and Saudi Aramco.',
    credentials: [
      'Worked at Baosteel, part of China Baowu Group: the world’s largest steel group and a Fortune Global 500 company',
      'Worked on a joint project between China Baowu and Saudi Aramco',
      'Leadership certificate from Harvard University (HarvardX)',
      'Jiangsu Government Scholarship, first prize (2020)',
      'First prize in Chinese and Academic Diligence Award, Central China Normal University (2016)',
      '120-hour TESOL certificate',
      'Creator Mastercourse, Nas Academy (2021)',
      'Speaks Arabic, Chinese and English',
    ],
  },
} as const

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
    const existing = current.credentials ?? []
    const have = new Set(existing.map((item) => item.text.trim()))
    const added = ADDITIONS[locale].credentials.filter((text) => !have.has(text))
    const bio = current.bio ?? ''
    const bioHasIt = bio.includes('Baowu') || bio.includes('باوو')
    if (added.length === 0 && bioHasIt) continue

    await payload.update({
      collection: 'team-members',
      id: founder.id,
      locale,
      depth: 0,
      req,
      data: {
        bio: bioHasIt || !bio ? bio : `${bio} ${ADDITIONS[locale].bio}`,
        credentials: [...existing, ...added.map((text) => ({ text }))],
      },
    })
  }
}

export async function down(): Promise<void> {
  // Content, not schema: the owner removes lines in the CMS if needed.
}
