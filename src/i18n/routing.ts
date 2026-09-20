import { defineRouting } from 'next-intl/routing'

/**
 * Arabic is the default locale and carries no prefix: the Arabic site lives at
 * `/`, the English one at `/en`. This is deliberate — the audience is
 * Arabic-speaking traders (brief §2), so Arabic is the site, not a translation
 * layer bolted onto an English original.
 *
 * `localePrefix: 'as-needed'` is what produces `/services` (Arabic) and
 * `/en/services` (English) from a single route tree, which in turn is what lets
 * the language switcher stay on the equivalent page instead of bouncing home.
 */
export const routing = defineRouting({
  locales: ['ar', 'en'] as const,
  defaultLocale: 'ar',
  localePrefix: 'as-needed',
  // Do not sniff Accept-Language. A Gulf trader on an English-default phone
  // should still land on the Arabic site, and a guessed redirect breaks the
  // canonical/hreflang contract with search engines.
  localeDetection: false,
})

export type Locale = (typeof routing.locales)[number]

export const locales = routing.locales
export const defaultLocale = routing.defaultLocale

/** Text direction for a locale. Drives `dir` on <html>; nothing else. */
export function directionOf(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

/** BCP-47 tag used in hreflang, OG locale and the html lang attribute. */
export function htmlLangOf(locale: Locale): string {
  return locale === 'ar' ? 'ar' : 'en'
}

export function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value)
}
