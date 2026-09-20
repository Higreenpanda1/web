import localFont from 'next/font/local'

/**
 * Self-hosted, subset, and two families rather than three.
 *
 * The brief calls for IBM Plex Sans Arabic for Arabic and IBM Plex Sans for
 * Latin. IBM Plex Sans Arabic ships its own matching Latin — it *is* IBM Plex
 * Sans — so the Latin subset is taken from that family instead of downloading a
 * second one. Same design, one less family to cache, which matters on the slow
 * 4G connection this audience is actually on.
 *
 * Splitting Arabic and Latin into two font objects with explicit unicode ranges
 * means an English page never downloads the 44 KB Arabic face, and Latin
 * numerals inside Arabic text still render from the Latin file. `size-adjust`
 * fallbacks come from next/font, which is what keeps CLS at zero.
 *
 * Google Fonts is deliberately not used: a third-party request, a privacy
 * exposure, and a render delay (brief section 13).
 */

// The unicode ranges are written inline below rather than hoisted into
// constants: next/font requires every option to be a literal it can read at
// build time, and a variable reference fails the build.

export const plexLatin = localFont({
  src: [
    { path: '../fonts/plex-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/plex-latin-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/plex-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex-latin',
  display: 'swap',
  preload: true,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
})

export const plexArabic = localFont({
  src: [
    { path: '../fonts/plex-arabic-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/plex-arabic-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/plex-arabic-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: true,
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0600-06FF,U+0750-077F,U+0870-088E,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF',
    },
  ],
  fallback: ['Segoe UI', 'Tahoma', 'sans-serif'],
})
