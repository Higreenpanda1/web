import { getTranslations } from 'next-intl/server'

import { CONSENT_STORAGE_KEY } from '@/lib/analytics-events'
import { ClickTracking } from './ClickTracking'
import { ConsentBanner } from './ConsentBanner'

import type { Locale } from '@/i18n/routing'

/**
 * Google Analytics 4 with Consent Mode v2.
 *
 * Two script tags, both carrying the page's nonce so the strict CSP lets them
 * run. The first is inline and runs before the tag: it declares every consent
 * signal denied (or restores a previously granted choice from storage) and
 * then queues `config`. gtag.js honours whatever is in the queue when it
 * arrives, so the property never sees a hit that was sent before consent was
 * decided. With `analytics_storage` denied the tag sets **no cookie** and
 * sends only cookieless pings, which is what the banner's "essential only"
 * choice means in practice; "accept" flips that one signal to granted.
 *
 * The three advertising signals are never granted anywhere. This property is
 * used for page and conversion statistics, not ads.
 *
 * `suppressHydrationWarning` is required alongside `nonce` (see Analytics.tsx).
 */
export async function GoogleAnalytics({
  measurementId,
  nonce,
  locale,
}: {
  measurementId: string
  nonce: string
  locale: Locale
}) {
  const t = await getTranslations({ locale, namespace: 'consent' })

  // The measurement ID is validated in src/lib/env.ts (letters, digits and a
  // dash), so it cannot break out of the string literal below.
  const bootstrap = [
    'window.dataLayer=window.dataLayer||[];',
    'function gtag(){dataLayer.push(arguments)}',
    'window.gtag=gtag;',
    `var c=null;try{c=localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)})}catch(e){}`,
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:c==='granted'?'granted':'denied'});",
    "gtag('js',new Date());",
    `gtag('config',${JSON.stringify(measurementId)},{allow_google_signals:false,allow_ad_personalization_signals:false});`,
  ].join('')

  return (
    <>
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: bootstrap }}
      />
      <script
        async
        nonce={nonce}
        suppressHydrationWarning
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
      />
      <ClickTracking />
      <ConsentBanner
        title={t('title')}
        body={t('body')}
        acceptLabel={t('accept')}
        declineLabel={t('decline')}
        privacyLabel={t('privacy')}
        regionLabel={t('region')}
      />
    </>
  )
}
