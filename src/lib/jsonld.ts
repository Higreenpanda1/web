import { lexicalToPlainText } from './lexical'
import { serverURL } from './env'
import { mediaUrl } from './seo'
import { absoluteUrl } from './url'

import type { Locale } from '@/i18n/routing'
import type { Category, Post, Service, SiteSetting, TeamMember } from '@/payload-types'

/**
 * Structured data. Organization on the homepage, Service on service pages and
 * BlogPosting on articles, as the build prompt requires. Everything is built
 * from CMS data rather than hard-coded, so the client changing the WhatsApp
 * number in Site settings changes it here too.
 *
 * Search engines and answer engines read the same graph, so the article schema
 * is deliberately complete: author as a Person with the founder's profiles,
 * publisher, word count, section, language, the translation link between the
 * Arabic and English renderings, and `speakable` on the takeaways and the
 * lead so an assistant knows which sentences to quote.
 */

const ORGANISATION_ID = `${serverURL}/#organization`
const WEBSITE_ID = `${serverURL}/#website`
const BLOG_ID = `${serverURL}/blog#blog`

function socialLinks(settings: SiteSetting): string[] {
  return [
    settings.social?.instagram,
    settings.social?.youtube,
    settings.social?.facebook,
    settings.social?.tiktok,
    settings.social?.linkedin,
  ].filter((url): url is string => Boolean(url))
}

export function organisationJsonLd(settings: SiteSetting, locale: Locale) {
  const sameAs = socialLinks(settings)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANISATION_ID,
        name: settings.organisationName,
        alternateName: locale === 'ar' ? 'HiGreenPanda' : 'هاي جرين باندا',
        url: absoluteUrl(locale, '/'),
        logo: {
          '@type': 'ImageObject',
          url: `${serverURL}/brand/web/logo-wordmark@2x.png`,
        },
        image: `${serverURL}/brand/social/og-image-${locale}.png`,
        description: settings.tagline ?? undefined,
        email: settings.email,
        telephone: settings.whatsappNumber,
        ...(sameAs.length ? { sameAs } : {}),
        address: (settings.offices ?? []).map((office) => ({
          '@type': 'PostalAddress',
          addressLocality: office.city,
          addressCountry: 'CN',
          streetAddress: office.address ?? undefined,
        })),
        areaServed: [
          { '@type': 'Country', name: 'Saudi Arabia' },
          { '@type': 'Country', name: 'Yemen' },
          { '@type': 'Country', name: 'United Arab Emirates' },
          { '@type': 'Place', name: 'MENA' },
        ],
        knowsLanguage: ['ar', 'en', 'zh'],
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'sales',
            telephone: settings.whatsappNumber,
            email: settings.email,
            availableLanguage: ['ar', 'en'],
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: absoluteUrl(locale, '/'),
        name: settings.organisationName,
        publisher: { '@id': ORGANISATION_ID },
        inLanguage: locale,
      },
    ],
  }
}

export function serviceJsonLd(service: Service, locale: Locale, settings: SiteSetting) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${absoluteUrl(locale, `/services/${service.slug}`)}#service`,
    name: service.title,
    description: service.summary,
    url: absoluteUrl(locale, `/services/${service.slug}`),
    inLanguage: locale,
    serviceType: service.title,
    provider: {
      '@type': 'Organization',
      '@id': ORGANISATION_ID,
      name: settings.organisationName,
      url: absoluteUrl(locale, '/'),
    },
    areaServed: [
      { '@type': 'Country', name: 'Saudi Arabia' },
      { '@type': 'Country', name: 'Yemen' },
      { '@type': 'Country', name: 'United Arab Emirates' },
    ],
    ...(service.image ? { image: mediaUrl(service.image, 'feature') ?? undefined } : {}),
    ...(typeof service.priceFrom === 'number' && service.priceFrom > 0
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'CNY',
            price: service.priceFrom,
            priceSpecification: {
              '@type': 'PriceSpecification',
              priceCurrency: 'CNY',
              minPrice: service.priceFrom,
            },
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  }
}

export function personJsonLd(member: TeamMember, locale: Locale, settings: SiteSetting) {
  const photo = typeof member.photo === 'object' ? mediaUrl(member.photo, 'card') : null
  const sameAs = [
    member.links?.instagram,
    member.links?.youtube,
    member.links?.linkedin,
    ...(member.isFounder ? socialLinks(settings) : []),
  ].filter((url, index, all): url is string => Boolean(url) && all.indexOf(url) === index)

  return {
    '@type': 'Person',
    '@id': `${serverURL}/about#${member.slug}`,
    name: member.name,
    jobTitle: member.role ?? undefined,
    description: member.bio ?? undefined,
    url: absoluteUrl(locale, '/about'),
    ...(photo ? { image: photo } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    worksFor: { '@id': ORGANISATION_ID },
    ...(member.credentials?.length
      ? { knowsAbout: member.credentials.map((item) => item.text) }
      : {}),
  }
}

export function blogPostingJsonLd(
  post: Post,
  locale: Locale,
  settings: SiteSetting,
  options: { availableLocales?: Locale[] } = {},
) {
  const author = typeof post.author === 'object' && post.author ? (post.author as TeamMember) : null
  const url = absoluteUrl(locale, `/blog/${post.slug}`)
  const otherLocale: Locale = locale === 'ar' ? 'en' : 'ar'
  const translated = (options.availableLocales ?? ['ar', 'en']).includes(otherLocale)
  const categories = (post.categories ?? []).filter(
    (entry): entry is Category => typeof entry === 'object' && entry !== null,
  )
  const keywords = uniqueKeywords([
    post.focusKeyword,
    ...categories.map((category) => category.title),
  ])
  const words = lexicalToPlainText(post.body).split(/\s+/).filter(Boolean).length

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    ...(post.keyTakeaways?.length
      ? { abstract: post.keyTakeaways.map((item) => item.text).join(' ') }
      : {}),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    isPartOf: { '@type': 'Blog', '@id': BLOG_ID, name: settings.organisationName },
    inLanguage: locale,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    ...(post.coverImage ? { image: [mediaUrl(post.coverImage, 'feature')].filter(Boolean) } : {}),
    ...(keywords.length ? { keywords: keywords.join(', ') } : {}),
    ...(categories[0] ? { articleSection: categories[0].title } : {}),
    ...(words ? { wordCount: words } : {}),
    author: author
      ? personJsonLd(author, locale, settings)
      : { '@type': 'Organization', '@id': ORGANISATION_ID },
    publisher: {
      '@type': 'Organization',
      '@id': ORGANISATION_ID,
      name: settings.organisationName,
      logo: { '@type': 'ImageObject', url: `${serverURL}/brand/web/logo-wordmark@2x.png` },
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['[data-speakable]'],
    },
    ...(translated
      ? {
          [locale === 'ar' ? 'workTranslation' : 'translationOfWork']: {
            '@type': 'BlogPosting',
            '@id': `${absoluteUrl(otherLocale, `/blog/${post.slug}`)}#article`,
            inLanguage: otherLocale,
          },
        }
      : {}),
    isAccessibleForFree: true,
  }
}

export function blogCollectionJsonLd(
  locale: Locale,
  settings: SiteSetting,
  posts: Post[],
  options: { path: string; name: string; description: string },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': absoluteUrl(locale, options.path),
    url: absoluteUrl(locale, options.path),
    name: options.name,
    description: options.description,
    inLanguage: locale,
    isPartOf: { '@type': 'Blog', '@id': BLOG_ID, name: settings.organisationName },
    publisher: { '@id': ORGANISATION_ID },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(locale, `/blog/${post.slug}`),
        name: post.title,
      })),
    },
  }
}

export function breadcrumbJsonLd(locale: Locale, trail: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(locale, item.path),
    })),
  }
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  if (items.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

/** Keywords without blanks or case-insensitive repeats, in their first-seen order. */
export function uniqueKeywords(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value?.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}
