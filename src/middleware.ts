import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { consume, networkPrefix } from '@/lib/rate-limit'
import { buildCsp, staticSecurityHeaders } from '@/lib/security-headers'
import { isInjectedSpamPath } from '@/lib/spam-patterns'

/**
 * One middleware doing five jobs, in this order:
 *
 *   1. Answer 410 Gone for the spam paths injected into the old site, before
 *      anything else touches them.
 *   2. Apply CMS-managed redirects (301/302/308/410) from the Redirects
 *      collection.
 *   3. Rate-limit the API and the admin surface per network.
 *   4. Keep the admin panel off its guessable path and behind the 2FA gate.
 *   5. Route the request to the right locale, and set the security headers.
 *
 * The redirect table is fetched from an internal route and cached in module
 * memory, refreshed at most once a minute. That is one internal request per
 * minute rather than a database round trip per visitor, and if the fetch fails
 * the middleware serves the last good table and carries on.
 */

const intlMiddleware = createIntlMiddleware(routing)

const ADMIN_PATH = '/hgp-studio'
const ADMIN_GATE_PATH = '/hgp-studio-gate'
const TWO_FACTOR_COOKIE = 'hgp_2fa'
const REDIRECT_TTL_MS = 60_000
/** The longest a visitor may ever wait for the redirect table on a cold start. */
const FIRST_LOAD_TIMEOUT_MS = 1_500

/**
 * Rate limits. Payload 3 dropped v2's built-in `rateLimit` option, so the API
 * and the admin surface are limited here instead. The enquiry form has its own,
 * tighter limit inside its server action.
 */
const API_LIMIT = { max: 120, windowMs: 60_000 }
const ADMIN_LIMIT = { max: 60, windowMs: 60_000 }

type RedirectRule = {
  from: string
  to: string | null
  type: '301' | '302' | '308' | '410'
}

let redirectCache: { rules: Map<string, RedirectRule>; expiresAt: number } = {
  rules: new Map(),
  expiresAt: 0,
}
let inFlight: Promise<void> | null = null

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProduction = process.env.NODE_ENV === 'production'

  const nonce = newNonce()
  const isAdminSurface =
    pathname === ADMIN_PATH ||
    pathname.startsWith(`${ADMIN_PATH}/`) ||
    pathname === ADMIN_GATE_PATH ||
    pathname.startsWith(`${ADMIN_GATE_PATH}/`)
  const csp = buildCsp(nonce, isProduction)

  // --- 1. Injected spam: gone, permanently ---------------------------------
  // Before trailing-slash canonicalisation, so /slot-gacor/ is answered in one
  // hop rather than 308-then-410.
  if (isInjectedSpamPath(pathname)) {
    return decorate(goneResponse(request), { csp, isProduction, pathname })
  }

  // --- 2. CMS-managed redirects --------------------------------------------
  const rule = shouldCheckRedirects(request, pathname)
    ? await lookupRedirect(request, pathname)
    : null
  if (rule) {
    if (rule.type === '410') {
      return decorate(goneResponse(request), { csp, isProduction, pathname })
    }
    if (rule.to) {
      const destination = rule.to.startsWith('http')
        ? new URL(rule.to)
        : publicUrl(rule.to, request)
      // Last line of defence against a loop. The Redirects collection refuses
      // a rule that points at its own source, but a rule written before that
      // validation existed — or one that becomes self-referential through a
      // trailing slash — must not be able to hang a browser.
      if (normalise(destination.pathname) !== normalise(pathname)) {
        return decorate(NextResponse.redirect(destination, Number(rule.type)), {
          csp,
          isProduction,
          pathname,
        })
      }
    }
  }

  // --- 2b. Trailing slash ---------------------------------------------------
  // Next's own version of this is switched off (see next.config.ts), so the
  // spam check and the CMS redirects above get the URL as the crawler has it.
  const trimmedPath = pathname.replace(/\/+$/, '')
  if (pathname.length > 1 && trimmedPath !== pathname) {
    // Built from the origin rather than cloning nextUrl: the clone carries
    // Next's own routing state and re-asserts the original pathname, which
    // produced a redirect to the very URL being redirected from.
    const canonical = publicUrl(`${trimmedPath || '/'}${request.nextUrl.search}`, request)
    return decorate(NextResponse.redirect(canonical, 308), { csp, isProduction, pathname })
  }

  // --- 3. Rate limiting for the API and the admin surface -------------------
  const limited = enforceRateLimit(request, pathname, isAdminSurface)
  if (limited) return decorate(limited, { csp, isProduction, pathname })

  // --- 4. Admin ------------------------------------------------------------
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // /admin is not a route here. Answering 404 rather than redirecting means a
    // scanner learns nothing about where the panel actually is.
    return decorate(new NextResponse(null, { status: 404 }), { csp, isProduction, pathname })
  }

  if (isAdminSurface) {
    const guard = guardAdmin(request)
    if (guard) return decorate(guard, { csp, isProduction, pathname })
    return decorate(
      NextResponse.next({ request: { headers: withRequestHeaders(request, nonce, csp) } }),
      { csp, isProduction, pathname },
    )
  }

  // --- 5. Locale routing ---------------------------------------------------
  // The REST API and the 410 handler are not localised pages; running them
  // through next-intl would rewrite /api/health to /ar/api/health and 404.
  // They still get the security headers and the rate limit above.
  if (pathname.startsWith('/api/') || pathname === '/gone') {
    return decorate(
      NextResponse.next({ request: { headers: withRequestHeaders(request, nonce, csp) } }),
      { csp, isProduction, pathname },
    )
  }

  return decorate(routeLocale(request, nonce, csp), { csp, isProduction, pathname })
}

/**
 * Run next-intl's locale routing, then re-issue its decision as a response that
 * also carries the nonce on the *request* headers.
 *
 * The round trip matters: Next only stamps a nonce onto its own bootstrap
 * scripts when it finds one in the incoming request's CSP header, and
 * next-intl's middleware builds its response without our headers. Rather than
 * fork it, read the routing decision back off the response — `location` for a
 * redirect, `x-middleware-rewrite` for a rewrite, both documented — and rebuild
 * it. Anything else next-intl set (Link headers, cookies) is copied across.
 */
function routeLocale(request: NextRequest, nonce: string, csp: string): NextResponse {
  const intlResponse = intlMiddleware(request)
  const requestHeaders = withRequestHeaders(request, nonce, csp)

  const location = intlResponse.headers.get('location')
  if (location) {
    return NextResponse.redirect(publicUrl(location, request), intlResponse.status)
  }

  const rewrite = intlResponse.headers.get('x-middleware-rewrite')
  const rebuilt = rewrite
    ? NextResponse.rewrite(internalUrl(rewrite, request), {
        request: { headers: requestHeaders },
      })
    : NextResponse.next({ request: { headers: requestHeaders } })

  // Copy what next-intl decided (Link headers, Vary, cookies) but not its
  // `x-middleware-*` control headers. Those are how Next encodes "replace the
  // request headers with this list", and next-intl's list does not contain the
  // nonce — copying it across silently overwrote ours, so `headers()` in a page
  // saw no x-nonce while the CSP still arrived by another path. The symptom was
  // a missing nonce on exactly the tags we add ourselves.
  intlResponse.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith('x-middleware-')) return
    rebuilt.headers.set(key, value)
  })
  for (const cookie of intlResponse.cookies.getAll()) {
    rebuilt.cookies.set(cookie)
  }

  return rebuilt
}

/**
 * Per-network rate limiting. Keyed by network prefix rather than exact address
 * so a whole office behind one NAT is treated as one caller — which is the
 * point — while no individual address is retained.
 */
function enforceRateLimit(
  request: NextRequest,
  pathname: string,
  isAdminSurface: boolean,
): NextResponse | null {
  const isApi = pathname.startsWith('/api/')
  if (!isApi && !isAdminSurface) return null
  // The health check is polled by Docker every 30 seconds; never limit it.
  if (pathname === '/api/health') return null

  const limit = isAdminSurface ? ADMIN_LIMIT : API_LIMIT
  const prefix = networkPrefix(
    request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for'),
  )
  const result = consume(`${isAdminSurface ? 'admin' : 'api'}:${prefix}`, limit.max, limit.windowMs)
  if (result.allowed) return null

  return new NextResponse('Too many requests', {
    status: 429,
    headers: {
      'Retry-After': String(result.retryAfterSeconds),
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

/**
 * URL building for rewrites and redirects.
 *
 * Both are built on `request.url` — the exact URL Next is serving — rather
 * than on `request.nextUrl.origin`, which in a production build reports
 * `localhost:3000` whatever host the request arrived on.
 *
 * That difference is not cosmetic. Next decides whether a rewrite is internal
 * by comparing its origin with the incoming request's. next-intl builds its
 * rewrite from `nextUrl`, so in production the rewrite of `/services` to
 * `/ar/services` came back on a foreign origin, Next proxied it to itself as a
 * fresh request, middleware ran again, next-intl stripped the default-locale
 * prefix back to `/services`, and the browser gave up with
 * ERR_TOO_MANY_REDIRECTS. Every page except /en was unreachable — in the
 * production build only, which is the one that matters. Behind Caddy the same
 * mismatch would have done it on the real domain.
 */
function internalUrl(target: string, request: NextRequest): URL {
  const parsed = new URL(target, request.url)
  return new URL(`${parsed.pathname}${parsed.search}`, request.url)
}

/**
 * A URL a browser will be sent to. Same origin as the request, but honouring
 * `x-forwarded-proto` so a request Caddy terminated as HTTPS and forwarded over
 * plain HTTP still redirects to an https:// address.
 */
function publicUrl(target: string, request: NextRequest): URL {
  const url = internalUrl(target, request)
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedProto) url.protocol = `${forwardedProto.split(',')[0]?.trim()}:`
  return url
}

/**
 * Two-factor gate. Payload's own login form is refused by the beforeLogin hook
 * on the Users collection, so this only has to stop an authenticated-but-
 * unverified session reaching the panel, and send everyone else to the gate.
 */
function guardAdmin(request: NextRequest): NextResponse | null {
  if (process.env.ADMIN_REQUIRE_2FA !== 'true') return null

  const { pathname } = request.nextUrl
  if (pathname === ADMIN_GATE_PATH || pathname.startsWith(`${ADMIN_GATE_PATH}/`)) return null
  if (request.cookies.has(TWO_FACTOR_COOKIE)) return null
  // Signing out must always work, verified or not.
  if (pathname.startsWith(`${ADMIN_PATH}/logout`)) return null

  const gate = publicUrl(ADMIN_GATE_PATH, request)
  if (pathname !== ADMIN_PATH) gate.searchParams.set('next', pathname)
  return NextResponse.redirect(gate, 302)
}

/**
 * Rewrite to the branded 410 handler, which sets the status itself.
 *
 * The handler lives at /gone, not /_gone: Next treats a leading underscore as a
 * private folder and excludes it from routing entirely, so the underscore
 * version builds without complaint and then 404s at runtime.
 */
function goneResponse(request: NextRequest): NextResponse {
  const url = internalUrl('/gone', request)
  url.searchParams.set('locale', request.nextUrl.pathname.startsWith('/en') ? 'en' : 'ar')
  return NextResponse.rewrite(url)
}

/**
 * Which requests are worth a redirect lookup.
 *
 * Crucially this excludes /api/, because the redirect table is itself fetched
 * from /api/redirects-map. Without it the first request awaits a fetch whose
 * own middleware pass awaits the same unresolved promise, and the server
 * deadlocks on request one — which is exactly what happened before this guard
 * existed. The `x-internal-request` header closes the same loop from the other
 * side.
 *
 * Redirects only ever apply to page URLs, so skipping the admin panel and the
 * 410 handler costs nothing.
 */
function shouldCheckRedirects(request: NextRequest, pathname: string): boolean {
  if (request.headers.get('x-internal-request') === '1') return false
  if (pathname.startsWith('/api/')) return false
  if (pathname.startsWith('/hgp-studio')) return false
  if (pathname === '/gone') return false
  return true
}

async function lookupRedirect(
  request: NextRequest,
  pathname: string,
): Promise<RedirectRule | null> {
  await ensureRedirects(request)
  const trimmed = pathname.replace(/\/+$/, '') || '/'
  return redirectCache.rules.get(trimmed) ?? null
}

async function ensureRedirects(request: NextRequest): Promise<void> {
  if (Date.now() < redirectCache.expiresAt) return

  // Later refreshes happen in the background so a slow database never delays a
  // visitor.
  const refresh = (inFlight ??= fetchRedirects(request).finally(() => {
    inFlight = null
  }))

  if (redirectCache.expiresAt !== 0) return

  // On a cold start, wait — but never indefinitely. If the table is slow to
  // arrive, serve the page now and redirect on a later request instead.
  await Promise.race([
    refresh,
    new Promise<void>((resolve) => {
      setTimeout(resolve, FIRST_LOAD_TIMEOUT_MS)
    }),
  ])
}

async function fetchRedirects(request: NextRequest): Promise<void> {
  try {
    const response = await fetch(new URL('/api/redirects-map', request.nextUrl.origin), {
      headers: { 'x-internal-request': '1' },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`redirects-map returned ${response.status}`)
    const body = (await response.json()) as { rules: RedirectRule[] }
    redirectCache = {
      rules: new Map(body.rules.map((entry) => [normalise(entry.from), entry])),
      expiresAt: Date.now() + REDIRECT_TTL_MS,
    }
  } catch {
    // Serve the last good table. A redirect that briefly stops working is far
    // better than a site that stops working.
    redirectCache = { rules: redirectCache.rules, expiresAt: Date.now() + 10_000 }
  }
}

function normalise(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

function withRequestHeaders(request: NextRequest, nonce: string, csp: string): Headers {
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('content-security-policy', csp)
  headers.set('x-pathname', request.nextUrl.pathname)
  return headers
}

function decorate(
  response: NextResponse,
  { csp, isProduction, pathname }: { csp: string; isProduction: boolean; pathname: string },
): NextResponse {
  for (const [name, value] of Object.entries(staticSecurityHeaders(isProduction))) {
    response.headers.set(name, value)
  }
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('x-pathname', pathname)
  return response
}

function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

export const config = {
  matcher: [
    /*
     * Everything except Next's own build output, the media files Payload
     * serves, and the static brand assets. Those are immutable and need no
     * routing, and keeping them out of middleware is most of the reason the
     * site stays fast on a slow connection.
     */
    '/((?!_next/static|_next/image|fonts/|brand/|media/|favicon\\.ico|favicon\\.svg|apple-touch-icon\\.png|icon-\\d+\\.png|icon-maskable-512\\.png|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest).*)',
  ],
}
