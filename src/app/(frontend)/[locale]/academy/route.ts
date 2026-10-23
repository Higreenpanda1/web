import { headers } from 'next/headers'

import { ACADEMY_PAGE_AR, ACADEMY_PAGE_EN, ACADEMY_PAGE_ZH } from '@/academy/academy-page'
import { issueFormToken } from '@/lib/form-guard'
import { fallbackOgImage } from '@/lib/seo'
import { absoluteUrl } from '@/lib/url'

/**
 * /academy, /en/academy and /academy?lang=zh — the sales page for the
 * recorded course «International Trade from A to Z». The site itself has no
 * Chinese locale yet, so Chinese rides on the Arabic route, as on /offices.
 *
 * Like /offices it is a standalone page with its own dark design, header and
 * language switch, so it is served as-is rather than inside the site layout.
 * Its one inline script gets the request's CSP nonce, its fonts come from the
 * site (the CSP refuses Google's), and its join form gets a fresh signed
 * token on every request, the same bot check the site's own forms use.
 */
export const dynamic = 'force-dynamic'

const FONT = '/offers/academy/fonts'

const ARABIC =
  'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC'
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'

type Face = { family: string; file: string; weight: string; style?: string; range: string }

const FACES: Face[] = [
  ...['300', '400', '500', '600', '700'].flatMap((weight) => [
    {
      family: 'IBM Plex Sans Arabic',
      file: `ibm-plex-sans-arabic-arabic-${weight}-normal`,
      weight,
      range: ARABIC,
    },
    {
      family: 'IBM Plex Sans Arabic',
      file: `ibm-plex-sans-arabic-latin-${weight}-normal`,
      weight,
      range: LATIN,
    },
  ]),
  ...(['400', '700'] as const).flatMap((weight) => [
    { family: 'Amiri', file: `amiri-arabic-${weight}-normal`, weight, range: ARABIC },
    { family: 'Amiri', file: `amiri-latin-${weight}-normal`, weight, range: LATIN },
  ]),
  {
    family: 'Amiri',
    file: 'amiri-arabic-400-italic',
    weight: '400',
    style: 'italic',
    range: ARABIC,
  },
  { family: 'Amiri', file: 'amiri-latin-400-italic', weight: '400', style: 'italic', range: LATIN },
  { family: 'Reem Kufi', file: 'reem-kufi-arabic-wght-normal', weight: '400 700', range: ARABIC },
  { family: 'Reem Kufi', file: 'reem-kufi-latin-wght-normal', weight: '400 700', range: LATIN },
  { family: 'Bodoni Moda', file: 'bodoni-moda-latin-opsz-normal', weight: '400 900', range: LATIN },
  {
    family: 'Bodoni Moda',
    file: 'bodoni-moda-latin-opsz-italic',
    weight: '400 900',
    style: 'italic',
    range: LATIN,
  },
  { family: 'IBM Plex Mono', file: 'ibm-plex-mono-latin-400-normal', weight: '400', range: LATIN },
  { family: 'IBM Plex Mono', file: 'ibm-plex-mono-latin-500-normal', weight: '500', range: LATIN },
]

const FONT_FACES = FACES.map(
  (face) =>
    `@font-face{font-family:"${face.family}";font-style:${face.style ?? 'normal'};font-weight:${face.weight};font-display:swap;src:url(${FONT}/${face.file}.woff2) format("woff2");unicode-range:${face.range}}`,
).join('')

const META = {
  ar: {
    title: 'التجارة الدولية من الألف إلى الياء | HiGreenPanda',
    description:
      'برنامج مسجّل مكتوب من جهة المصدّر الصيني نفسه: كيف يسعّر، وماذا يخشى، وكيف يقرأ من يجلس أمامه. ستّ مراحل و44 درساً، للمستورد والمصدّر.',
    ogLocale: 'ar_AR',
    siteName: 'هاي جرين باندا',
  },
  en: {
    title: 'International Trade from A to Z | HiGreenPanda',
    description:
      "A recorded programme written from the Chinese exporter's own side: how he prices, what he fears, and how he reads the person across the table. Six stages, 44 lessons, for importers and exporters.",
    ogLocale: 'en_GB',
    siteName: 'HiGreenPanda',
  },
  zh: {
    title: '国际贸易从A到Z | HiGreenPanda',
    description:
      '从中国出口商自己的角度写成的录播课程：他如何定价、担心什么、如何解读坐在对面的人。六个阶段、44节课，适合进口商和出口商。',
    ogLocale: 'zh_CN',
    siteName: 'HiGreenPanda',
  },
} as const

const PAGES = { ar: ACADEMY_PAGE_AR, en: ACADEMY_PAGE_EN, zh: ACADEMY_PAGE_ZH }

function attr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const nonce = (await headers()).get('x-nonce') ?? ''
  const lang =
    locale === 'en' ? 'en' : new URL(request.url).searchParams.get('lang') === 'zh' ? 'zh' : 'ar'
  const meta = META[lang]
  const zhUrl = `${absoluteUrl('ar', '/academy')}?lang=zh`
  const canonical = lang === 'zh' ? zhUrl : absoluteUrl(lang, '/academy')
  const image = fallbackOgImage(lang === 'ar' ? 'ar' : 'en')

  const body = PAGES[lang]
    .replace('<script>', `<script nonce="${attr(nonce)}">`)
    .replace('%%FORM_TOKEN%%', issueFormToken())

  const html = `<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${attr(meta.title)}</title>
<meta name="description" content="${attr(meta.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#062414">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="ar" href="${absoluteUrl('ar', '/academy')}">
<link rel="alternate" hreflang="en" href="${absoluteUrl('en', '/academy')}">
<link rel="alternate" hreflang="zh" href="${zhUrl}">
<link rel="alternate" hreflang="x-default" href="${absoluteUrl('ar', '/academy')}">
<link rel="icon" href="/favicon.ico">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(meta.siteName)}">
<meta property="og:locale" content="${meta.ogLocale}">
<meta property="og:title" content="${attr(meta.title)}">
<meta property="og:description" content="${attr(meta.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<style>${FONT_FACES}</style>
${body}
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // The page carries a fresh form token, so no shared cache may keep it.
      'Cache-Control': 'private, no-store',
    },
  })
}
