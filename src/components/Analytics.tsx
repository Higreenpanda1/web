import { analytics, googleAnalyticsId } from '@/lib/env'
import { GoogleAnalytics } from './analytics/GoogleAnalytics'

import type { Locale } from '@/i18n/routing'

/**
 * Analytics, in two flavours that can run side by side:
 *
 * - Self-hosted Plausible or Umami — no cookies, so no banner, which is one
 *   fewer thing between a visitor on a slow connection and the enquiry form.
 * - Google Analytics 4 (`GA_MEASUREMENT_ID`), behind Consent Mode v2 and the
 *   consent banner; see analytics/GoogleAnalytics.tsx.
 *
 * Each renders nothing at all when unconfigured, so a missing environment
 * variable never puts a broken script tag on the page.
 *
 * The nonce comes from middleware; without it the strict CSP would block
 * these. `suppressHydrationWarning` is required alongside it: React
 * deliberately does not expose `nonce` to the client, so the attribute the
 * server wrote never matches what the client sees.
 */
export function Analytics({ nonce, locale }: { nonce: string; locale: Locale }) {
  return (
    <>
      <SelfHosted nonce={nonce} />
      {googleAnalyticsId ? (
        <GoogleAnalytics measurementId={googleAnalyticsId} nonce={nonce} locale={locale} />
      ) : null}
    </>
  )
}

function SelfHosted({ nonce }: { nonce: string }) {
  if (!analytics.provider || !analytics.scriptUrl) return null

  if (analytics.provider === 'umami') {
    return (
      <script
        defer
        nonce={nonce}
        suppressHydrationWarning
        src={analytics.scriptUrl}
        data-website-id={analytics.siteId}
      />
    )
  }

  return (
    <script
      defer
      nonce={nonce}
      suppressHydrationWarning
      src={analytics.scriptUrl}
      data-domain={analytics.siteId}
    />
  )
}
