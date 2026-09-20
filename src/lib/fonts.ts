import localFont from 'next/font/local'

/**
 * Self-hosted, subset, two weights per language, and not preloaded.
 *
 * The brief calls for IBM Plex Sans Arabic for Arabic and IBM Plex Sans for
 * Latin. IBM Plex Sans Arabic ships its own matching Latin — it *is* IBM Plex
 * Sans — so the Latin subset is taken from that family instead of downloading a
 * second one. Same design, one less family to cache, which matters on the slow
 * 4G connection this audience is actually on.
 *
 * Splitting Arabic and Latin into two font objects with explicit unicode ranges
 * means an English page never downloads the 43 KB Arabic face, and Latin
 * numerals inside Arabic text still render from the Latin file.
 *
 * Two weights, not three. The brief's type scale asks for 600 on H2 and H3, but
 * it also says two weights per language is enough — and the 600 files cost
 * another 67 KB, which on this audience's connection is worse than a heading
 * set one step heavier. The browser resolves 600 to 700 automatically.
 *
 * `preload: false` is the bigger decision. Fonts were 189 KB, more than all the
 * JavaScript on the page, and preloading them put every byte in front of the
 * first paint: LCP was 2.8 s with 86% of it render delay. Without the preload
 * the text paints immediately in the system fallback and swaps when the web
 * font arrives. The @font-face rules are in the inlined stylesheet, so the
 * fonts still start downloading on the first parse — they simply no longer
 * block anyone from reading the page.
 *
 * Google Fonts is deliberately not used: a third-party request, a privacy
 * exposure, and a render delay (brief section 13).
 *
 * WHY THERE ARE NO `fallback` LISTS HERE. next/font appends the fallback
 * fonts to the CSS variable it exports, so `var(--font-plex-latin)` used to
 * expand to `plexLatin, "plexLatin Fallback", ui-sans-serif, system-ui,
 * sans-serif`. Put that first in a font stack and `sans-serif` — which can
 * draw Arabic — sits ahead of plexArabic, so the Arabic face was never
 * requested and the entire Arabic site rendered in a system font. The generic
 * fallbacks now live once, at the end of `--font-sans` in globals.css, after
 * both real faces. The Latin face also drops its metric-adjusted fallback:
 * that face is `local(Arial)` with no unicode-range, and Arial has Arabic
 * glyphs too, so it would have caught the Arabic text just the same.
 */

// The unicode ranges are written inline below rather than hoisted into
// constants: next/font requires every option to be a literal it can read at
// build time, and a variable reference fails the build.

export const plexLatin = localFont({
  src: [
    { path: '../fonts/plex-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/plex-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex-latin',
  display: 'swap',
  preload: false,
  fallback: [],
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
})

export const plexArabic = localFont({
  src: [
    { path: '../fonts/plex-arabic-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/plex-arabic-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
  fallback: [],
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0600-06FF,U+0750-077F,U+0870-088E,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF',
    },
  ],
})
