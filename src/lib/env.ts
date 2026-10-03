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

export const email = {
  from: process.env.EMAIL_FROM_ADDRESS ?? 'website@higreenpanda.com',
  fromName: process.env.EMAIL_FROM_NAME ?? 'HiGreenPanda',
  notifyTo: (process.env.ENQUIRY_NOTIFY_TO ?? 'contact@higreenpanda.com')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean),
  /**
   * Application forms also go to these, on top of ENQUIRY_NOTIFY_TO. The
   * owner reads sami@ and asked for every application there.
   */
  applicationNotifyTo: (process.env.APPLICATION_NOTIFY_TO ?? 'sami@higreenpanda.com')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean),
  configured: Boolean(process.env.RESEND_API_KEY),
}

/**
 * HubSpot CRM. The ids default to this brand's portal: the services pipeline,
 * its "New Inquiry / 新咨询" stage, and the owner (Sami) who gets the tasks.
 */
export const hubspot = {
  token: process.env.HUBSPOT_TOKEN ?? '',
  pipelineId: process.env.HUBSPOT_PIPELINE_ID || 'default',
  newStageId: process.env.HUBSPOT_NEW_STAGE_ID || '4392706760',
  ownerId: process.env.HUBSPOT_OWNER_ID ?? '99402659',
  configured: Boolean(process.env.HUBSPOT_TOKEN),
}

export { required }
