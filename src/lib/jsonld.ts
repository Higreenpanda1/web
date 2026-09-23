import { serverURL } from './env'
import { mediaUrl } from './seo'
import { absoluteUrl } from './url'

import type { Locale } from '@/i18n/routing'
import type { Post, Service, SiteSetting, TeamMember } from '@/payload-types'

/**
 * Structured data. Organization on the homepage, Service on service pages and
 * BlogPosting on articles, as the build prompt requires. Everything is built
 * from CMS data rather than hard-coded, so the client changing the WhatsApp
 * number in Site settings changes it here too.
 */

const ORGANISATION_ID = `${serverURL}/#organization`
const WEBSITE_ID = `${serverURL}/#website`

export function organisationJsonLd(settings: SiteSetting, locale: Locale) {
  const sameAs = [
    settings.social?.instagram,
    settings.social?.youtube,
    settings.social?.facebook,
    settings.social?.tiktok,
    settings.social?.linkedin,
  ].filter((url): url is string => Boolean(url))

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

export function blogPostingJsonLd(post: Post, locale: Locale, settings: SiteSetting) {
  const author = typeof post.author === 'object' && post.author ? (post.author as TeamMember) : null
  const url = absoluteUrl(locale, `/blog/${post.slug}`)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    url,
    mainEntityOfPage: url,
    inLanguage: locale,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    ...(post.coverImage ? { image: mediaUrl(post.coverImage, 'feature') ?? undefined } : {}),
    author: author
      ? { '@type': 'Person', name: author.name, jobTitle: author.role ?? undefined }
      : { '@type': 'Organization', '@id': ORGANISATION_ID },
    publisher: {
      '@type': 'Organization',
      '@id': ORGANISATION_ID,
      name: settings.organisationName,
      logo: { '@type': 'ImageObject', url: `${serverURL}/brand/web/logo-wordmark@2x.png` },
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
