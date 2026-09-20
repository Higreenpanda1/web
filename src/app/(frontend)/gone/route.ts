import { isLocale } from '@/i18n/routing'

import type { NextRequest } from 'next/server'

/**
 * 410 Gone.
 *
 * The old site was injected with spam pages that Google still holds in its
 * index. A 404 tells a crawler "try again later"; a 410 tells it "this is
 * permanently gone", and Google drops a 410 considerably faster. Middleware
 * rewrites every matching path here.
 *
 * It is a route handler rather than a page because only a route handler can set
 * the status code, and the status is the entire point. The markup is built as a
 * string rather than rendered through React: the App Router forbids
 * react-dom/server, and this page has to render on a request that middleware
 * short-circuits, with no stylesheet, no font and no JavaScript.
 *
 * The path has no leading underscore because Next treats `_folder` as private
 * and excludes it from routing altogether.
 */
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get('locale') ?? 'ar'
  const locale = isLocale(requested) ? requested : 'ar'
  const isArabic = locale === 'ar'

  const copy = isArabic
    ? {
        title: 'هذه الصفحة أُزيلت نهائيًا',
        body: 'هذا الرابط لم يكن من موقعنا. أُضيف إليه محتوى غير مشروع في اختراق سابق، وقد أُزيل نهائيًا.',
        home: 'العودة إلى الرئيسية',
        brand: 'هاي جرين باندا',
      }
    : {
        title: 'This page has been permanently removed',
        body: 'This URL was never part of our site. It was injected in an earlier compromise and has been permanently removed.',
        home: 'Back to the homepage',
        brand: 'HiGreenPanda',
      }

  const html = `<!doctype html>
<html lang="${locale}" dir="${isArabic ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>410 — ${escapeHtml(copy.title)}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${GONE_STYLES}</style>
</head>
<body>
<main>
<p class="code">410</p>
<h1>${escapeHtml(copy.title)}</h1>
<p class="body">${escapeHtml(copy.body)}</p>
<a href="${isArabic ? '/' : '/en'}">${escapeHtml(copy.home)}</a>
<p class="brand">${escapeHtml(copy.brand)}</p>
</main>
</body>
</html>`

  return new Response(html, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Inlined rather than loaded: this is the one page on the site where loading a
 * stylesheet or a font would be absurd.
 */
const GONE_STYLES = `
:root{color-scheme:light dark;--green:#276B34;--deep:#12341B;--ink:#111;--muted:#4C574F;--bg:#F7F9F7;--paper:#fff}
@media (prefers-color-scheme:dark){:root{--ink:#E6EDE7;--muted:#A9B6AC;--bg:#0E1410;--paper:#161E18;--green:#74C07E;--deep:#D7ECDA}}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:grid;place-items:center;background:var(--bg);color:var(--ink);
font-family:ui-sans-serif,system-ui,'Segoe UI',Tahoma,sans-serif;line-height:1.7;padding:1.5rem}
main{max-width:34rem;text-align:center;background:var(--paper);padding:2.5rem 1.75rem;border-radius:1rem}
.code{font-size:3rem;font-weight:700;color:var(--green);margin:0;direction:ltr}
h1{font-size:1.5rem;line-height:1.35;color:var(--deep);margin:.5rem 0 0}
.body{color:var(--muted);margin:1rem 0 1.75rem}
a{display:inline-block;min-height:2.75rem;padding:.75rem 1.5rem;border-radius:.625rem;
background:var(--green);color:#fff;text-decoration:none;font-weight:600}
@media (prefers-color-scheme:dark){a{color:#0E1410}}
a:focus-visible{outline:3px solid var(--green);outline-offset:3px}
.brand{margin:1.75rem 0 0;font-size:.875rem;color:var(--muted)}
`
