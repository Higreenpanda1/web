import 'dotenv/config'

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import config from '../payload.config'
import { richText } from './rich-text'

import type { Service } from '../payload-types'
import type { SeedServiceCopy } from './catalogue'

/**
 * Writes the Chinese locale, and only the Chinese locale: site settings, the
 * services and the founder. Arabic and English are never touched, so this is
 * safe to run against a live site whose content has been edited in the CMS
 * since it was seeded. Anything without a Chinese value here (field visits,
 * other team members, the blog) falls back to English (payload.config.ts).
 *
 * Idempotent: services and the founder are matched by slug, and a slug the
 * database does not have is skipped rather than created.
 *
 *   npm run seed:zh
 */

type ZhContent = {
  services: Record<string, SeedServiceCopy>
  founder: { role: string; bio: string; credentials: string[] }
  settings: {
    tagline: string
    whatsappPrefill: string
    workingHours: string
    offices: Array<{ city: string; address: string }>
  }
}

const here = path.dirname(fileURLToPath(import.meta.url))
const ZH = JSON.parse(readFileSync(path.join(here, 'zh-content.json'), 'utf8')) as ZhContent

const NAV = [
  { label: '服务', href: '/services' },
  { label: '咨询', href: '/apply/consultation' },
  { label: '学院', href: '/academy' },
  { label: '关于我们', href: '/about' },
  { label: '博客', href: '/blog' },
  { label: '联系我们', href: '/contact' },
]

async function main() {
  const payload = await getPayload({ config })

  console.log('→ Site settings (zh)')
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'zh',
    data: {
      organisationName: 'HiGreen Panda Marketing',
      tagline: ZH.settings.tagline,
      whatsappPrefill: ZH.settings.whatsappPrefill,
      workingHours: ZH.settings.workingHours,
      offices: ZH.settings.offices,
      primaryNav: NAV,
    },
  })

  console.log('→ Services (zh)')
  for (const [slug, copy] of Object.entries(ZH.services)) {
    const found = await payload.find({
      collection: 'services',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    const doc = found.docs[0]
    if (!doc) {
      console.log(`  ${slug}: not in this database, skipped`)
      continue
    }
    await payload.update({
      collection: 'services',
      id: doc.id,
      locale: 'zh',
      data: {
        title: copy.title,
        summary: copy.summary,
        body: richText(copy.body) as Service['body'],
        highlights: copy.highlights.map((text) => ({ text })),
        requirements: (copy.requirements ?? []).map((text) => ({ text })),
        faqs: copy.faqs ?? [],
        _status: 'published',
      },
    })
    console.log(`  ${slug} → ${doc.id}`)
  }

  console.log('→ Founder (zh)')
  const founder = await payload.find({
    collection: 'team-members',
    where: { slug: { equals: 'sami-al-hajri' } },
    limit: 1,
    depth: 0,
  })
  if (founder.docs[0]) {
    await payload.update({
      collection: 'team-members',
      id: founder.docs[0].id,
      locale: 'zh',
      data: {
        name: '萨米·哈吉里',
        role: ZH.founder.role,
        bio: ZH.founder.bio,
        credentials: ZH.founder.credentials.map((text) => ({ text })),
      },
    })
    console.log(`  sami-al-hajri → ${founder.docs[0].id}`)
  } else {
    console.log('  founder not in this database, skipped')
  }

  console.log('\nDone. Restart the app so its cache picks the Chinese content up.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
