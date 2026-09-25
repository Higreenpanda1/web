/**
 * Security headers, applied in middleware so they cover every response
 * including redirects and the 410s — not just rendered pages.
 *
 * `script-src` is nonce-based rather than `unsafe-inline`. Next.js reads the
 * nonce out of the CSP header set on the *request* and stamps it onto its own
 * bootstrap scripts, which is what makes a strict policy workable with the App
 * Router at all.
 *
 * One policy covers the public site and the admin panel. They had separate
 * policies while the site's was stricter about styles; now that `style-src`
 * has to allow inline everywhere (see below), the two were identical, and an
 * unused distinction in a security header is just somewhere for them to drift
 * apart.
 */

export type CspOptions = {
  /**
   * Google Analytics 4 is on. Adds exactly the origins the Google tag needs
   * (see `GOOGLE_ANALYTICS_SOURCES`) and nothing else; when it is off the
   * policy is byte-for-byte what it was before GA4 existed.
   */
  googleAnalytics?: boolean
}

/**
 * The origins Google Analytics 4 talks to, per Google's own CSP guidance for
 * gtag.js. Google Signals and Ads features are *not* enabled on this property,
 * so `*.g.doubleclick.net` and `*.google.com` are deliberately absent — adding
 * them would be the moment the strict policy started to leak.
 *
 * `script-src` is unaffected in any browser that understands 'strict-dynamic'
 * (all current ones): the tag loads because the page's nonce is on the
 * `<script>` element, and the host entry is a fallback for old engines only.
 * The collection endpoints are regional (`region1.google-analytics.com`), hence
 * the wildcards.
 */
export const GOOGLE_ANALYTICS_SOURCES = {
  'script-src': ['https://www.googletagmanager.com'],
  'connect-src': [
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com',
  ],
  // The tag falls back to an image beacon when `fetch`/`sendBeacon` is not
  // available or a request is blocked.
  'img-src': ['https://*.google-analytics.com', 'https://*.googletagmanager.com'],
} as const

export function buildCsp(nonce: string, isProduction: boolean, options: CspOptions = {}): string {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"]

  /**
   * Scripts are nonce-based and strict. Styles cannot be, and pretending
   * otherwise produces a policy that silently breaks the page.
   *
   * A CSP nonce does not cover `style="..."` attributes at all — only <style>
   * elements — and React, next/font and Payload's admin all emit inline style
   * attributes. Worse, a blocked style fails silently: when this was strict,
   * the floating WhatsApp button lost its inline position and quietly moved to
   * the wrong side of the Arabic site, with nothing visible but a console line.
   *
   * So `style-src` allows inline. The exposure is bounded: an injected style
   * cannot execute code, and the directive that actually stops cross-site
   * scripting — `script-src` with a nonce and 'strict-dynamic' — stays strict,
   * as do object-src, base-uri, form-action and frame-ancestors.
   */
  const styleSrc = ["'self'", "'unsafe-inline'"]

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': styleSrc,
    // data: covers the inlined blur placeholders next/image generates.
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'media-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    // No third-party embeds anywhere. A YouTube embed would need youtube.com
    // adding here and nowhere else.
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }

  if (isProduction) {
    directives['upgrade-insecure-requests'] = []
  } else {
    // Next's dev overlay and fast refresh need eval and a websocket.
    directives['script-src'] = [...scriptSrc, "'unsafe-eval'"]
    directives['connect-src'] = ["'self'", 'ws:', 'wss:']
  }

  if (options.googleAnalytics) {
    for (const [directive, sources] of Object.entries(GOOGLE_ANALYTICS_SOURCES)) {
      directives[directive] = [...(directives[directive] ?? []), ...sources]
    }
  }

  return Object.entries(directives)
    .map(([directive, values]) => (values.length ? `${directive} ${values.join(' ')}` : directive))
    .join('; ')
}

/** Everything that is the same on every response. */
export function staticSecurityHeaders(isProduction: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    // Nothing on this site uses any of these. Denying them outright means a
    // compromised dependency cannot quietly start asking for them.
    'Permissions-Policy': [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'usb=()',
      'interest-cohort=()',
    ].join(', '),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-DNS-Prefetch-Control': 'off',
  }

  if (isProduction) {
    // Two years, subdomains included, and preload-eligible. Only ever sent over
    // HTTPS, so local development is unaffected.
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
  }

  return headers
}
