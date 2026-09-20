import { defaultLocale, type Locale } from '@/i18n/routing'
import { serverURL } from './env'

/**
 * Path helpers. Arabic carries no prefix and English carries `/en`, so every
 * URL the site emits — canonical, hreflang, sitemap, OG — goes through here
 * rather than through string concatenation at the call site.
 */

export function localePath(locale: Locale, path = '/'): string {
  const clean = path === '/' ? '' : `/${path.replace(/^\/+|\/+$/g, '')}`
  if (locale === defaultLocale) return clean || '/'
  return `/en${clean}`
}

export function absoluteUrl(locale: Locale, path = '/'): string {
  return `${serverURL}${localePath(locale, path)}`
}

/** Strip the locale prefix from a pathname, e.g. /en/services → /services. */
export function stripLocale(pathname: string): string {
  const withoutPrefix = pathname.replace(/^\/en(?=\/|$)/, '')
  return withoutPrefix === '' ? '/' : withoutPrefix
}

/**
 * hreflang alternates for a page, including x-default. x-default points at the
 * Arabic version because that is the primary site, not a fallback.
 */
export function alternatesFor(path = '/'): {
  canonical: string
  languages: Record<string, string>
} {
  return {
    canonical: absoluteUrl(defaultLocale, path),
    languages: {
      ar: absoluteUrl('ar', path),
      en: absoluteUrl('en', path),
      'x-default': absoluteUrl('ar', path),
    },
  }
}

/** Canonical + alternates for one locale's rendering of a page. */
export function canonicalFor(locale: Locale, path = '/') {
  return {
    canonical: absoluteUrl(locale, path),
    languages: alternatesFor(path).languages,
  }
}

/** A wa.me link with an optional pre-filled message. */
export function whatsappLink(number: string, message?: string): string {
  const digits = number.replace(/[^\d]/g, '')
  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${query}`
}
