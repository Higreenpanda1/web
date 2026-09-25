/**
 * Environment access in one place, so a missing variable fails loudly at the
 * boundary instead of silently rendering "undefined" into a canonical URL.
 */

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. See .env.example.`)
  }
  return value
}

/** Public origin, no trailing slash. */
export const serverURL = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
)

export const isProduction = process.env.NODE_ENV === 'production'

export const adminRequires2FA = process.env.ADMIN_REQUIRE_2FA === 'true'

export const analytics = {
  provider: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? '',
  scriptUrl: process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL ?? '',
  siteId: process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID ?? '',
}

/**
 * Google Analytics 4. Off until a measurement ID (`G-XXXXXXXXXX`) is set.
 *
 * Read at request time on the server and handed to the client as a prop, not
 * inlined at build time: the production image is built without the real
 * `.env`, so a `NEXT_PUBLIC_` variable would be baked in empty. Setting the
 * value in `.env` and recreating the `app` container is enough.
 */
export const googleAnalyticsId = normaliseGaId(process.env.GA_MEASUREMENT_ID)

function normaliseGaId(value: string | undefined): string {
  const id = value?.trim() ?? ''
  return /^G-[A-Z0-9]{4,20}$/i.test(id) ? id.toUpperCase() : ''
}

/**
 * Search engine site verification. Each renders one `<meta>` tag in the head
 * of every page when set, and nothing when empty. The token is the `content`
 * value only, not the whole tag.
 */
export const siteVerification = {
  google: (process.env.GOOGLE_SITE_VERIFICATION ?? '').trim(),
  bing: (process.env.BING_SITE_VERIFICATION ?? '').trim(),
}

export const email = {
  from: process.env.EMAIL_FROM_ADDRESS ?? 'website@higreenpanda.com',
  fromName: process.env.EMAIL_FROM_NAME ?? 'HiGreenPanda',
  notifyTo: (process.env.ENQUIRY_NOTIFY_TO ?? 'contact@higreenpanda.com')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean),
  configured: Boolean(process.env.RESEND_API_KEY),
}

export { required }
