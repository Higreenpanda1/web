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

  experimental: {
    optimizePackageImports: ['lucide-react'],
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

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
