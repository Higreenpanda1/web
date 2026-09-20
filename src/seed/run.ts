import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'
import { FOUNDER, REDIRECTS, SERVICES } from './content'

/**
 * Seeds a fresh database with the content from WEBSITE-BRIEF.md.
 *
 * Idempotent: every record is matched by slug (or `from`, for redirects) and
 * updated rather than duplicated, so this is safe to re-run after editing
 * src/seed/content.ts. It never deletes anything an editor has created.
 *
 *   npm run seed
 */

async function main() {
  const payload = await getPayload({ config })

  console.log('→ Site settings')
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'ar',
    data: {
      organisationName: 'هاي جرين باندا للتسويق',
      tagline: 'مصدرك الأول في تقديم جميع أنواع الخدمات التجارية في الصين',
      whatsappNumber: '+8613023440305',
      whatsappPrefill: 'السلام عليكم، أريد الاستفسار عن خدماتكم.',
      email: 'contact@higreenpanda.com',
      secondaryEmail: 'Sam@higreenpanda.com',
      workingHours: 'الأحد – الخميس، 09:00 – 18:00 بتوقيت الصين',
      offices: [
        { city: 'شنجن', address: 'مقرنا الرئيسي' },
        { city: 'شنغهاي', address: 'مكتبنا الثاني' },
      ],
      social: {
        instagram: 'https://instagram.com/higreenpanda',
        youtube: 'https://youtube.com/@Higreenpanda',
      },
      primaryNav: [
        { label: 'الخدمات', href: '/services' },
        { label: 'من نحن', href: '/about' },
        { label: 'المدونة', href: '/blog' },
        { label: 'تواصل معنا', href: '/contact' },
      ],
      legalUpdatedAt: new Date().toISOString(),
    },
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'en',
    data: {
      organisationName: 'HiGreen Panda Marketing',
      tagline: 'Your first source for every kind of business service in China',
      whatsappPrefill: 'Hello, I would like to ask about your services.',
      workingHours: 'Sunday–Thursday, 09:00–18:00 China time',
      offices: [
        { city: 'Shenzhen', address: 'Head office' },
        { city: 'Shanghai', address: 'Second office' },
      ],
      primaryNav: [
        { label: 'Services', href: '/services' },
        { label: 'About', href: '/about' },
        { label: 'Blog', href: '/blog' },
        { label: 'Contact', href: '/contact' },
      ],
    },
  })

  console.log('→ Founder')
  const founderId = await upsert(
    payload,
    'team-members',
    { slug: { equals: FOUNDER.slug } },
    {
      ar: {
        slug: FOUNDER.slug,
        name: FOUNDER.ar.name,
        role: FOUNDER.ar.role,
        bio: FOUNDER.ar.bio,
        credentials: FOUNDER.ar.credentials.map((text) => ({ text })),
        isFounder: true,
        order: 1,
        links: {
          instagram: 'https://instagram.com/higreenpanda',
          youtube: 'https://youtube.com/@Higreenpanda',
          email: 'Sam@higreenpanda.com',
        },
      },
      en: {
        name: FOUNDER.en.name,
        role: FOUNDER.en.role,
        bio: FOUNDER.en.bio,
        credentials: FOUNDER.en.credentials.map((text) => ({ text })),
      },
    },
  )
  console.log(`  founder id ${founderId}`)

  console.log('→ Services')
  for (const service of SERVICES) {
    const id = await upsert(
      payload,
      'services',
      { slug: { equals: service.slug } },
      {
        ar: {
          slug: service.slug,
          title: service.ar.title,
          summary: service.ar.summary,
          body: richText(service.ar.body),
          highlights: service.ar.highlights.map((text) => ({ text })),
          icon: service.icon,
          featured: service.featured,
          order: service.order,
          _status: 'published',
        },
        en: {
          title: service.en.title,
          summary: service.en.summary,
          body: richText(service.en.body),
          highlights: service.en.highlights.map((text) => ({ text })),
          _status: 'published',
        },
      },
    )
    console.log(`  ${service.slug} → ${id}`)
  }

  console.log('→ Redirects')
  for (const redirect of REDIRECTS) {
    await upsert(
      payload,
      'redirects',
      { from: { equals: redirect.from } },
      {
        ar: {
          from: redirect.from,
          to: redirect.to ?? undefined,
          type: redirect.type,
          enabled: true,
          note: redirect.note,
        },
      },
    )
  }
  console.log(`  ${REDIRECTS.length} rules`)

  console.log('→ Admin user')
  await seedAdmin(payload)

  console.log('\nDone. Sign in at /hgp-studio-gate')
  process.exit(0)
}

/**
 * Create-or-update by a unique field, writing the Arabic locale first and the
 * English one as a second pass. Payload writes one locale per operation, and
 * Arabic is the default locale, so it has to carry the non-localised fields.
 */
async function upsert(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: 'services' | 'team-members' | 'redirects' | 'pages' | 'posts',
  where: Record<string, unknown>,
  data: { ar: Record<string, unknown>; en?: Record<string, unknown> },
): Promise<number> {
  const existing = await payload.find({
    collection,
    where: where as never,
    limit: 1,
    depth: 0,
    // Drafts count: re-running the seed must not create a second copy of a
    // document an editor has since unpublished.
    draft: true,
  })

  const found = existing.docs[0]
  const id = found
    ? (
        await payload.update({
          collection,
          id: found.id,
          locale: 'ar',
          data: data.ar as never,
        })
      ).id
    : (
        await payload.create({
          collection,
          locale: 'ar',
          data: data.ar as never,
        })
      ).id

  if (data.en) {
    await payload.update({
      collection,
      id,
      locale: 'en',
      data: data.en as never,
    })
  }

  return id as number
}

/** Minimal Lexical document from plain paragraphs. */
function richText(text: string) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: null,
      children: text.split('\n\n').map((paragraph) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        textFormat: 0,
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: paragraph,
            version: 1,
          },
        ],
      })),
    },
  }
}

async function seedAdmin(payload: Awaited<ReturnType<typeof getPayload>>) {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    console.log('  skipped — set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one')
    return
  }

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  })

  if (existing.docs.length > 0) {
    console.log(`  ${email} already exists`)
    return
  }

  await payload.create({
    collection: 'users',
    data: { email, password, name: 'Administrator', role: 'admin' },
  })
  console.log(`  created ${email}`)
  console.log('  now enrol a second factor:  npm run totp:enrol -- ' + email)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
