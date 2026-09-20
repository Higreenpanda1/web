import type { MetadataRoute } from 'next'

/**
 * Generated rather than served as a static file so the brand colours stay tied
 * to the tokens in one place. Matches brand-assets/site.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HiGreenPanda — هاي جرين باندا',
    short_name: 'HiGreenPanda',
    description: 'Your first source for business services in China.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#378D42',
    dir: 'rtl',
    lang: 'ar',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
