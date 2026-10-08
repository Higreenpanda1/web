import { headers } from 'next/headers'

import { GUANGZHOU_OFFICES_PAGE } from '@/offers/guangzhou-offices'

/**
 * /offices and /en/offices — the Guangzhou registration offices offer, shared
 * by link (WhatsApp status and the like) on the company's own domain.
 *
 * It is a standalone page with its own header and language switch rather than
 * a site page, so it is served as-is. Its one inline script gets the request's
 * CSP nonce, and its fonts come from the site, not Google.
 */
export const dynamic = 'force-dynamic'

const FONT = '/offers/guangzhou-offices/fonts'

const FONT_FACES = [
  ['IBM Plex Sans Arabic', 'ibm-plex-sans-arabic-arabic'],
  ['IBM Plex Sans', 'ibm-plex-sans-latin'],
]
  .flatMap(([family, file]) =>
    [400, 500, 700].map(
      (weight) =>
        `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;src:url(${FONT}/${file}-${weight}-normal.woff2) format("woff2")}`,
    ),
  )
  .join('')

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const nonce = (await headers()).get('x-nonce') ?? ''
  const lang = locale === 'en' ? 'en' : 'ar'
  const body = GUANGZHOU_OFFICES_PAGE.replace('<script>', `<script nonce="${nonce}">`)

  const html = `<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<style>${FONT_FACES}body{margin:0}</style>
${body}
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
