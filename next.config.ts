import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'

import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * The old WordPress site was injected with spam pages and one person held all
 * the access. Two consequences show up in this file:
 *   - `poweredByHeader` off and a strict header set applied in middleware.ts
 *   - no remote image hosts at all; every image is either in /public or an
 *     upload served by Payload from this origin.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // A leaked stack trace is a free map of the codebase for whoever finds it.
  productionBrowserSourceMaps: false,
  output: 'standalone',

  /**
   * Next's own trailing-slash redirect runs before middleware, which turns
   * /en/home/ into two hops: 308 to /en/home, then our 301 to /en. The old
   * site's URLs are indexed *with* trailing slashes and the injected spam
   * pages were too, so that extra hop is paid by exactly the requests that
   * matter most. Middleware normalises the slash itself instead — see the
   * canonicalisation step in src/middleware.ts.
   */
  skipTrailingSlashRedirect: true,

  images: {
    // AVIF first, WebP second — the audience is on mid-range Androids over 4G.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Uploads are validated on the way in (see Media collection) and served
    // from /api/media/file/* on this origin. No remotePatterns by design.
    remotePatterns: [],
    dangerouslyAllowSVG: false,
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  /**
   * Always render metadata into <head>, for every user agent.
   *
   * By default Next streams metadata into the body for anything it does not
   * recognise as a "limited" bot, on the reasoning that Googlebot executes
   * JavaScript. That leaves the description and OG tags outside <head> for
   * every crawler and preview tool not on Next's list — and this site's job is
   * converting social traffic (brief section 7), where a link preview that
   * fails is a lost enquiry. Metadata here is built from cached queries, so
   * blocking on it costs almost nothing.
   */
  htmlLimitedBots: /.*/,

  experimental: {
    optimizePackageImports: ['lucide-react'],
    // The stylesheet is small and every page needs all of it, so a separate
    // request just delays first paint on a slow connection.
    inlineCss: true,
  },

  // Payload writes its own types; don't let a transient type error in the
  // generated file block a production build of the site itself.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

const configured = withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })

/**
 * Scope Payload's colour-scheme client hint to the admin panel.
 *
 * `withPayload` appends `Accept-CH`, `Vary` and `Critical-CH` for
 * Sec-CH-Prefers-Color-Scheme on `/:path*` — every route on the site. It does
 * that so the admin panel can render in the user's preferred theme on the
 * first paint, which is reasonable for the admin panel and expensive
 * everywhere else: `Critical-CH` tells Chrome to discard the response and
 * reissue the request with the hint attached, so every first-time visitor pays
 * a full extra round trip before any HTML arrives. On the 4G connection this
 * site is built for that is the single most expensive thing on the page, and
 * it buys the public site nothing — its dark mode is pure CSS.
 *
 * So the rule is narrowed rather than removed. Everything else `withPayload`
 * configures is left exactly as it was.
 */
const PAYLOAD_GLOBAL_HEADER_SOURCE = '/:path*'
const ADMIN_HEADER_SOURCE = '/hgp-studio/:path*'

const payloadHeaders = configured.headers

configured.headers = async () => {
  const rules = (await payloadHeaders?.()) ?? []
  return rules.map((rule) =>
    rule.source === PAYLOAD_GLOBAL_HEADER_SOURCE &&
    rule.headers.some((header) => header.key === 'Accept-CH')
      ? { ...rule, source: ADMIN_HEADER_SOURCE }
      : rule,
  )
}

export default configured
