import type { Locale } from './routing'

/**
 * Western Arabic numerals in both locales (build prompt §1). The `-u-nu-latn`
 * extension is the only reliable way to stop the Arabic locale rendering
 * Arabic-Indic digits, and it has to be on every Intl call, not just some.
 * If the client ever asks for ١٢٣٤, change INTL_LOCALE and nothing else.
 */
export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB'
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value)
}

export function formatDate(value: string | Date, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** ISO date for <time datetime> and structured data. */
export function isoDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toISOString()
}
