import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // Western Arabic numerals in both locales (build prompt §1): `ar-u-nu-latn`
    // keeps Intl.NumberFormat and Intl.DateTimeFormat from emitting ١٢٣٤.
    formats: {
      number: {
        plain: { useGrouping: false },
      },
      dateTime: {
        long: { day: 'numeric', month: 'long', year: 'numeric' },
        short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      },
    },
    timeZone: 'Asia/Shanghai',
  }
})
