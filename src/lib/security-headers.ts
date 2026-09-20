/**
 * Security headers, applied in middleware so they cover every response
 * including redirects and the 410s — not just rendered pages.
 *
 * The CSP is nonce-based rather than `unsafe-inline`. Next.js reads the nonce
 * out of the CSP header we set on the *request* and stamps it onto its own
 * bootstrap scripts, which is what makes a strict policy workable with the App
 * Router at all.
 */

export type CspTarget = 'site' | 'admin'

export function buildCsp(nonce: string, target: CspTarget, isProduction: boolean): string {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"]

  // The admin panel is Payload's own bundle: it injects styles at runtime and
  // uses blob workers for uploads, so it needs a slightly wider policy than the
  // public site. It is behind authentication and a second factor, and the two
  // policies are kept apart precisely so the public site is not loosened to
  // suit it.
  const styleSrc =
    target === 'admin' ? ["'self'", "'unsafe-inline'"] : ["'self'", `'nonce-${nonce}'`]

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
    directives['style-src'] = ["'self'", "'unsafe-inline'"]
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
