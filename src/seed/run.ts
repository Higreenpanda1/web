import 'dotenv/config'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import config from '../payload.config'
import { CATEGORIES, FOUNDER, POSTS, REDIRECTS, SERVICES } from './content'

/**
 * Seeds a fresh database with the content from WEBSITE-BRIEF.md.
 *
 * Idempotent: every record is matched by slug (or `from`, for redirects) and
 * updated rather than duplicated, so this is safe to re-run after editing
 * src/seed/content.ts. It never deletes anything an editor has created — which
 * also means removing an entry from src/seed/content.ts does not remove it from
 * a database that already has it. Delete it in the admin panel.
 *
 * It runs in its own process, so it cannot invalidate a running server's cache
 * the way an edit in the admin panel does. DEPLOY.md avoids the problem by
 * seeding before the app container starts; if you seed against a site that is
 * already up, restart it — the note printed at the end says so.
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
      // The four networks connected in Metricool, 20 September 2026.
      social: {
        instagram: 'https://instagram.com/higreenpanda',
        youtube: 'https://youtube.com/@Higreenpanda',
        facebook: 'https://www.facebook.com/100765135463061',
        tiktok: 'https://www.tiktok.com/@higreenpanda',
      },
      primaryNav: [
        { label: 'الخدمات', href: '/services' },
        { label: 'استشارة', href: '/apply/consultation' },
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
        { label: 'Consultation', href: '/apply/consultation' },
        { label: 'About', href: '/about' },
        { label: 'Blog', href: '/blog' },
        { label: 'Contact', href: '/contact' },
      ],
    },
  })

  console.log('→ Founder photo')
  const founderPhotoId = await upsertMedia(payload, {
    filePath: path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'founder-sami.jpg'),
    alt: {
      ar: 'سامي الحجري، مؤسس هاي جرين باندا',
      en: 'Sami Al-Hajri, founder of HiGreenPanda',
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
        photo: founderPhotoId,
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
          requirements: (service.ar.requirements ?? []).map((text) => ({ text })),
          faqs: service.ar.faqs ?? [],
          icon: service.icon,
          category: service.category,
          priceFrom: service.priceFrom ?? null,
          priceUnit: service.priceUnit ?? 'once',
          applicationType: service.applicationType ?? null,
          featured: service.featured,
          order: service.order,
          _status: 'published',
        },
        en: {
          title: service.en.title,
          summary: service.en.summary,
          body: richText(service.en.body),
          highlights: service.en.highlights.map((text) => ({ text })),
          requirements: (service.en.requirements ?? []).map((text) => ({ text })),
          faqs: service.en.faqs ?? [],
          _status: 'published',
        },
      },
    )
    console.log(`  ${service.slug} → ${id}`)
  }

  console.log('→ Categories')
  const categoryIds = new Map<string, number>()
  for (const category of CATEGORIES) {
    const id = await upsert(
      payload,
      'categories',
      { slug: { equals: category.slug } },
      {
        ar: { slug: category.slug, title: category.ar },
        en: { title: category.en },
      },
    )
    categoryIds.set(category.slug, id)
  }
  console.log(`  ${CATEGORIES.length} categories`)

  console.log('→ Blog')
  for (const post of POSTS) {
    const coverId = post.cover
      ? await upsertMedia(payload, {
          filePath: path.join(
            path.dirname(fileURLToPath(import.meta.url)),
            'assets',
            post.cover.file,
          ),
          alt: post.cover.alt,
        })
      : null
    const id = await upsert(
      payload,
      'posts',
      { slug: { equals: post.slug } },
      {
        ar: {
          slug: post.slug,
          title: post.ar.title,
          excerpt: post.ar.excerpt,
          body: richText(post.ar.body),
          publishedAt: post.publishedAt,
          author: founderId,
          // Only set when the upload worked; never blank an editor's own choice.
          ...(coverId ? { coverImage: coverId } : {}),
          categories: post.categories.flatMap((slug) => {
            const id = categoryIds.get(slug)
            return id ? [id] : []
          }),
          _status: 'published',
        },
        en: {
          title: post.en.title,
          excerpt: post.en.excerpt,
          body: richText(post.en.body),
          _status: 'published',
        },
      },
    )
    console.log(`  ${post.slug} → ${id}`)
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
  console.log(
    '\nIf the site was ALREADY RUNNING when this ran, restart it now:\n' +
      '  docker compose -f docker-compose.prod.yml restart app\n' +
      'This script runs in its own process, so it cannot drop the running\n' +
      "server's cache the way an edit in the admin panel does, and the site\n" +
      'would serve pre-seed content for up to an hour.\n' +
      'On a first deploy the app has not started yet, so there is nothing to\n' +
      'restart — that is why DEPLOY.md seeds before bringing the app up.',
  )
  process.exit(0)
}

/**
 * Create-or-update by a unique field, writing the Arabic locale first and the
 * English one as a second pass. Payload writes one locale per operation, and
 * Arabic is the default locale, so it has to carry the non-localised fields.
 */
async function upsert(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: 'services' | 'team-members' | 'redirects' | 'pages' | 'posts' | 'categories',
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

/**
 * Upload a file from the seed's own assets folder, once. Matched by its Arabic
 * alt text, so re-running the seed reuses the existing Media document instead
 * of uploading a second copy — and an editor who replaces the photo in the
 * CMS keeps their replacement, because the alt text is what is looked up.
 */
async function upsertMedia(
  payload: Awaited<ReturnType<typeof getPayload>>,
  { filePath, alt }: { filePath: string; alt: { ar: string; en: string } },
): Promise<number | null> {
  const existing = await payload.find({
    collection: 'media',
    where: { alt: { equals: alt.ar } },
    limit: 1,
    depth: 0,
  })
  const found = existing.docs[0]
  if (found) {
    console.log(`  reusing media ${found.id}`)
    return found.id
  }

  try {
    const created = await payload.create({
      collection: 'media',
      locale: 'ar',
      data: { alt: alt.ar },
      filePath,
    })
    await payload.update({
      collection: 'media',
      id: created.id,
      locale: 'en',
      data: { alt: alt.en },
    })
    console.log(`  uploaded ${path.basename(filePath)} as media ${created.id}`)
    return created.id
  } catch (error) {
    // A missing or unreadable file must not stop the rest of the seed.
    console.warn(`  could not upload ${filePath}: ${(error as Error).message}`)
    return null
  }
}

/**
 * A Lexical document from lightly marked-up text: paragraphs separated by a
 * blank line, `## ` for an H3 (H2 is the page's own section headings), and
 * consecutive `- ` lines for a bulleted list. Enough for the seed content;
 * anything richer is edited in the CMS.
 */
function richText(text: string) {
  const textNode = (value: string) => ({
    type: 'text',
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text: value,
    version: 1,
  })
  const block = (chunk: string) => {
    if (chunk.startsWith('## ')) {
      return {
        type: 'heading',
        tag: 'h3',
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        children: [textNode(chunk.slice(3).trim())],
      }
    }
    if (chunk.startsWith('- ')) {
      return {
        type: 'list',
        listType: 'bullet',
        tag: 'ul',
        start: 1,
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        children: chunk.split('\n').map((line, index) => ({
          type: 'listitem',
          value: index + 1,
          format: '',
          indent: 0,
          version: 1,
          direction: null,
          children: [textNode(line.replace(/^- /, '').trim())],
        })),
      }
    }
    return {
      type: 'paragraph',
      format: '',
      indent: 0,
      version: 1,
      direction: null,
      textFormat: 0,
      children: [textNode(chunk)],
    }
  }
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: null,
      children: text
        .split('\n\n')
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map(block),
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
