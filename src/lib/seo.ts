import { serverURL } from './env'
import { canonicalFor } from './url'

import type { Locale } from '@/i18n/routing'
import type { Media } from '@/payload-types'
import type { Metadata } from 'next'

/**
 * Metadata for every route, built from one function so canonical URLs,
 * hreflang alternates and OG images cannot drift apart between pages.
 *
 * The brand OG images are per language (brief section 14): a link shared into
 * an Arabic WhatsApp group should preview in Arabic.
 */

type SeoOverrides = {
  title?: string | null
  description?: string | null
  image?: Media | number | null
  noindex?: boolean | null
}

type BuildArgs = {
  locale: Locale
  path: string
  title: string
  description: string
  seo?: SeoOverrides | null
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
}

export function fallbackOgImage(locale: Locale): string {
  return `${serverURL}/brand/social/og-image-${locale}.png`
}

/**
 * The `src` for a next/image of an upload: a same-origin path, never an
 * absolute URL. `remotePatterns` is empty by design (next.config.ts), so the
 * optimiser refuses `https://<host>/api/media/...` with "url parameter is not
 * allowed" — every uploaded photo on the site rendered as a broken image until
 * this existed. Use `mediaUrl` only where an absolute URL is genuinely needed:
 * Open Graph tags and structured data.
 */
export function mediaSrc(
  media: Media | number | null | undefined,
  size?: keyof NonNullable<Media['sizes']>,
): string | null {
  const url = mediaUrl(media, size)
  return url ? url.replace(serverURL, '') || '/' : null
}

export function mediaUrl(
  media: Media | number | null | undefined,
  size?: keyof NonNullable<Media['sizes']>,
): string | null {
  if (!media || typeof media === 'number') return null
  if (size && media.sizes) {
    const variant = media.sizes[size]
    if (variant && typeof variant === 'object' && 'url' in variant && variant.url) {
      return absolutise(variant.url)
    }
  }
  return media.url ? absolutise(media.url) : null
}

function absolutise(url: string): string {
  return url.startsWith('http') ? url : `${serverURL}${url}`
}

export function buildMetadata({
  locale,
  path,
  title,
  description,
  seo,
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
}: BuildArgs): Metadata {
  const finalTitle = seo?.title?.trim() || title
  const finalDescription = seo?.description?.trim() || description
  const ogImage = mediaUrl(seo?.image, 'og') ?? fallbackOgImage(locale)
  const alternates = canonicalFor(locale, path)

  return {
    title: finalTitle,
    description: finalDescription,
    alternates,
    robots: seo?.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: {
      type,
      title: finalTitle,
      description: finalDescription,
      url: alternates.canonical,
      siteName: locale === 'ar' ? 'هاي جرين باندا' : 'HiGreenPanda',
      locale: locale === 'ar' ? 'ar_AR' : 'en_GB',
      alternateLocale: locale === 'ar' ? ['en_GB'] : ['ar_AR'],
      images: [{ url: ogImage, width: 1200, height: 630, alt: finalTitle }],
      ...(type === 'article' ? { publishedTime, modifiedTime, authors } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: finalDescription,
      images: [ogImage],
    },
  }
}

/** Trim a description to something a search result will actually show. */
export function clampDescription(input: string | null | undefined, max = 155): string {
  if (!input) return ''
  const clean = input.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}
