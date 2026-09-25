/**
 * The browser side of Google Analytics 4: the consent record and the custom
 * events. Everything here is a no-op when the tag is not on the page, so the
 * calling code never has to ask whether analytics is configured.
 *
 * Consent is stored in localStorage rather than a cookie. A cookie would be
 * sent with every request for no reason, and "the site sets no cookie until
 * you agree" is a cleaner promise than "one cookie, but it is only the
 * record of your answer".
 */

export const CONSENT_STORAGE_KEY = 'hgp-consent'
/** Dispatched on `window` whenever the stored choice changes or is cleared. */
export const CONSENT_CHANGE_EVENT = 'hgp:consent-change'

export type ConsentChoice = 'granted' | 'denied'

export type AnalyticsEventName =
  | 'whatsapp_click'
  | 'enquiry_sent'
  | 'application_sent'
  | 'language_switch'

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

export function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    // Storage disabled (private mode, blocked third-party context): behave as
    // if never asked, which is the cautious answer.
    return null
  }
}

export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice)
  } catch {
    // Nothing to do; the choice still applies for this page view.
  }
  applyConsent(choice)
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: choice }))
}

export function clearConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY)
  } catch {
    // ignore
  }
  applyConsent('denied')
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: null }))
}

/**
 * Consent Mode v2 update. Only `analytics_storage` is ever granted: the
 * property has no advertising features, so the three ad signals stay denied
 * whatever the visitor chooses.
 */
export function applyConsent(choice: ConsentChoice): void {
  window.gtag?.('consent', 'update', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: choice,
  })
}

/**
 * Send a custom event. Under Consent Mode the tag decides what to do with it
 * (a cookieless ping before consent, a full hit after), so callers do not
 * check consent themselves.
 */
export function trackEvent(name: AnalyticsEventName, params: Record<string, string> = {}): void {
  window.gtag?.('event', name, params)
}
