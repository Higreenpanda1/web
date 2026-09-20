import { analytics } from '@/lib/env'

/**
 * Self-hosted Plausible or Umami — no cookies, so no cookie banner, which is
 * one fewer thing between a visitor on a slow connection and the enquiry form.
 * Renders nothing at all when unconfigured, so a missing environment variable
 * never puts a broken script tag on the page.
 *
 * The nonce comes from middleware; without it the strict CSP would block this.
 * `suppressHydrationWarning` is required alongside it: React deliberately does
 * not expose `nonce` to the client, so the attribute the server wrote never
 * matches what the client sees.
 */
export function Analytics({ nonce }: { nonce: string }) {
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
