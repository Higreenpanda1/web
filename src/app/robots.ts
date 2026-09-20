import { serverURL } from '@/lib/env'

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // The admin panel and the API are not content. Note this is a
          // politeness measure, not a security one — the panel is protected by
          // authentication, a second factor and an optional IP allowlist.
          '/hgp-studio',
          '/hgp-studio-gate',
          '/api/',
          '/gone',
        ],
      },
    ],
    sitemap: `${serverURL}/sitemap.xml`,
    host: serverURL,
  }
}
