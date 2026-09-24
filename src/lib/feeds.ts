import { lexicalToPlainText } from './lexical'
import { serverURL } from './env'
import { getAllPosts, getServices, getSiteSettings } from './queries'
import { mediaUrl } from './seo'
import { absoluteUrl } from './url'

import type { Locale } from '@/i18n/routing'
import type { Category, Post } from '@/payload-types'

/**
 * The machine-readable views of the blog: an RSS feed per language and the
 * llms.txt pair that AI crawlers read. All three are built from the same
 * cached queries the pages use, so they can never disagree with the site.
 */

const FEED_ITEMS = 50

export async function buildRssFeed(locale: Locale): Promise<string> {
  const [settings, posts] = await Promise.all([
    getSiteSettings(locale),
    getAllPosts(locale, { depth: 1, limit: FEED_ITEMS }),
  ])
  const blogUrl = absoluteUrl(locale, '/blog')
  const feedUrl = `${serverURL}${locale === 'en' ? '/en' : ''}/feed.xml`
  const title = `${settings.organisationName} — ${locale === 'ar' ? 'المدونة' : 'Blog'}`
  const description =
    locale === 'ar'
      ? 'أدلّة عملية عن الاستيراد من الصين وتأسيس الشركات والمعارض التجارية والشحن.'
      : 'Practical guides on importing from China, company formation, trade fairs and shipping.'

  const items = posts
    .map((post) => {
      const url = absoluteUrl(locale, `/blog/${post.slug}`)
      const image =
        typeof post.coverImage === 'object' ? mediaUrl(post.coverImage, 'feature') : null
      const categories = (post.categories ?? []).filter(
        (entry): entry is Category => typeof entry === 'object' && entry !== null,
      )
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
${categories.map((category) => `      <category>${escapeXml(category.title)}</category>`).join('\n')}
${image ? `      <enclosure url="${escapeXml(image)}" type="image/webp" length="0" />` : ''}
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${blogUrl}</link>
    <description>${escapeXml(description)}</description>
    <language>${locale}</language>
    <lastBuildDate>${new Date(posts[0]?.publishedAt ?? Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <image>
      <url>${serverURL}/brand/web/logo-wordmark@2x.png</url>
      <title>${escapeXml(title)}</title>
      <link>${blogUrl}</link>
    </image>
${items}
  </channel>
</rss>
`
}

/**
 * llms.txt — the index an AI crawler reads first: what the business is, what
 * it offers and where every article lives, in both languages. Kept short and
 * link-heavy on purpose; the full text is in llms-full.txt.
 */
export async function buildLlmsTxt(): Promise<string> {
  const [settingsAr, settingsEn, servicesAr, servicesEn, postsAr, postsEn] = await Promise.all([
    getSiteSettings('ar'),
    getSiteSettings('en'),
    getServices('ar', { limit: 60 }),
    getServices('en', { limit: 60 }),
    getAllPosts('ar', { depth: 0 }),
    getAllPosts('en', { depth: 0 }),
  ])

  const lines: string[] = []
  lines.push(`# ${settingsEn.organisationName} (${settingsAr.organisationName})`)
  lines.push('')
  lines.push(
    `> ${settingsEn.tagline ?? 'Trade services in China for Arabic-speaking importers'}. Based in Shenzhen and Shanghai. Product sourcing, manufacturing, quality inspection, shipping, company formation in China, e-commerce launch support and trade-fair accompaniment, for importers and entrepreneurs in the Gulf, Yemen and the wider Arab world. Arabic is the primary language of the site; every page has an English version under /en.`,
  )
  lines.push('')
  lines.push(`Contact: WhatsApp ${settingsEn.whatsappNumber}, ${settingsEn.email}.`)
  lines.push('')
  lines.push('## Services (English)')
  for (const service of servicesEn) {
    lines.push(
      `- [${service.title}](${absoluteUrl('en', `/services/${service.slug}`)}): ${service.summary}`,
    )
  }
  lines.push('')
  lines.push('## الخدمات (العربية)')
  for (const service of servicesAr) {
    lines.push(
      `- [${service.title}](${absoluteUrl('ar', `/services/${service.slug}`)}): ${service.summary}`,
    )
  }
  lines.push('')
  lines.push('## Articles (English)')
  for (const post of postsEn) {
    lines.push(`- [${post.title}](${absoluteUrl('en', `/blog/${post.slug}`)}): ${post.excerpt}`)
  }
  lines.push('')
  lines.push('## المقالات (العربية)')
  for (const post of postsAr) {
    lines.push(`- [${post.title}](${absoluteUrl('ar', `/blog/${post.slug}`)}): ${post.excerpt}`)
  }
  lines.push('')
  lines.push('## Optional')
  lines.push(`- [Full article text](${serverURL}/llms-full.txt)`)
  lines.push(`- [RSS, Arabic](${serverURL}/feed.xml)`)
  lines.push(`- [RSS, English](${serverURL}/en/feed.xml)`)
  lines.push(`- [Sitemap](${serverURL}/sitemap.xml)`)
  return lines.join('\n') + '\n'
}

/** llms-full.txt — every article in full, as plain text with its URL and date. */
export async function buildLlmsFullTxt(): Promise<string> {
  const [postsEn, postsAr] = await Promise.all([
    getAllPosts('en', { depth: 1 }),
    getAllPosts('ar', { depth: 1 }),
  ])
  const sections: string[] = []
  sections.push(await buildLlmsTxt())
  sections.push('\n---\n\n# Full text\n')
  for (const [locale, posts] of [
    ['en', postsEn],
    ['ar', postsAr],
  ] as Array<[Locale, Post[]]>) {
    for (const post of posts) {
      sections.push(articleAsText(post, locale))
    }
  }
  return sections.join('\n')
}

export function articleAsText(post: Post, locale: Locale): string {
  const takeaways = (post.keyTakeaways ?? []).map((item) => `- ${item.text}`).join('\n')
  const faqs = (post.faqs ?? [])
    .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
    .join('\n\n')
  return [
    `## ${post.title}`,
    `URL: ${absoluteUrl(locale, `/blog/${post.slug}`)}`,
    `Language: ${locale}`,
    `Published: ${post.publishedAt.slice(0, 10)}${post.updatedAt ? ` · Updated: ${post.updatedAt.slice(0, 10)}` : ''}`,
    '',
    post.excerpt,
    takeaways ? `\nKey takeaways:\n${takeaways}` : '',
    '',
    lexicalToPlainText(post.body),
    faqs ? `\nQuestions answered:\n\n${faqs}` : '',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n')
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
