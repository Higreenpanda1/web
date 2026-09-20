import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { Analytics } from '@/components/Analytics'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { directionOf, routing, type Locale } from '@/i18n/routing'
import { serverURL } from '@/lib/env'
import { plexArabic, plexLatin } from '@/lib/fonts'
import { getSiteSettings } from '@/lib/queries'
import { alternatesFor } from '@/lib/url'

import '@/styles/globals.css'

import type { Metadata, Viewport } from 'next'

/**
 * Root layout for the public site. The (payload) route group has its own root
 * layout, which is what keeps Payload's stylesheet and this one apart.
 *
 * `dir` and `lang` are set here, from the route, and nothing else in the
 * codebase branches on direction: every component uses logical properties, so
 * this attribute is the whole RTL system.
 *
 * A deliberate trade-off: reading the CSP nonce from `headers()` opts every
 * page out of static prerendering. That is inherent to a nonce-based policy —
 * a nonce that is baked into static HTML is not a nonce. The alternative is
 * `'unsafe-inline'` for scripts, which is the hole the strict policy exists to
 * close, so the strict policy wins. The cost is bounded: every database read
 * goes through `unstable_cache` (src/lib/queries.ts), so a dynamic render is a
 * React render against warm data on the same machine, not a round trip.
 */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#378D42' },
    { media: '(prefers-color-scheme: dark)', color: '#12341B' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Never block zoom: this audience reads on phones, often in bright sunlight,
  // and pinch-to-zoom is an accessibility requirement (WCAG 2.2, 1.4.4).
  maximumScale: 5,
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  const t = await getTranslations({ locale })

  return {
    metadataBase: new URL(serverURL),
    title: {
      default: `${t('site.name')} — ${t('site.tagline')}`,
      template: `%s · ${t('site.name')}`,
    },
    description: t('site.description'),
    applicationName: t('site.name'),
    alternates: alternatesFor('/'),
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', sizes: '48x48' },
      ],
      apple: '/apple-touch-icon.png',
    },
    formatDetection: { telephone: false },
    robots: { index: true, follow: true },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  // Required for static rendering of a localised route tree.
  setRequestLocale(locale)

  const typedLocale = locale as Locale
  const [t, settings, headerList] = await Promise.all([
    getTranslations({ locale }),
    getSiteSettings(typedLocale),
    headers(),
  ])
  const nonce = headerList.get('x-nonce') ?? ''

  return (
    <html
      lang={locale}
      dir={directionOf(typedLocale)}
      className={`${plexLatin.variable} ${plexArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        {/* The provider wraps the whole document, not just the page: the header
            contains client components (the language switcher, the mobile menu)
            that need the locale context too. */}
        <NextIntlClientProvider>
          <a href="#main" className="skip-link">
            {t('nav.skipToContent')}
          </a>

          <Header locale={typedLocale} settings={settings} />

          <main id="main" className="flex-1">
            {children}
          </main>

          <Footer locale={typedLocale} settings={settings} />

          <WhatsAppButton
            number={settings.whatsappNumber}
            label={t('cta.whatsapp')}
            ariaLabel={t('cta.whatsappAria', { number: settings.whatsappNumber })}
            prefill={settings.whatsappPrefill}
          />
        </NextIntlClientProvider>

        <Analytics nonce={nonce} />
      </body>
    </html>
  )
}
