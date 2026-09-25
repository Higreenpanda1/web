/**
 * Browser checks for Google Analytics 4, Consent Mode v2, the CSP additions
 * and the site-verification tags, against a running production server that
 * was started with the three variables set:
 *
 *   GA_MEASUREMENT_ID=G-TEST12345 GOOGLE_SITE_VERIFICATION=x BING_SITE_VERIFICATION=y npm start
 *   GA_MEASUREMENT_ID=G-TEST12345 GOOGLE_SITE_VERIFICATION=x BING_SITE_VERIFICATION=y npm run test:analytics
 *
 * Google itself is never contacted: the request for gtag.js is answered with a
 * stub, which is enough to prove the CSP nonce let the tag execute. What the
 * tag would then send is read straight off `window.dataLayer`.
 *
 * Same shape as tests/e2e.mjs on purpose: one file, no framework.
 */
import { chromium } from 'playwright'

const BASE = (process.env.BASE ?? 'http://127.0.0.1:3000').replace(/\/+$/, '')
const GA = process.env.GA_MEASUREMENT_ID
if (!GA || !process.env.GOOGLE_SITE_VERIFICATION || !process.env.BING_SITE_VERIFICATION) {
  console.error(
    'Set GA_MEASUREMENT_ID, GOOGLE_SITE_VERIFICATION and BING_SITE_VERIFICATION to the values the server runs with.',
  )
  process.exit(2)
}
const SHOT_DIR = process.env.SHOT_DIR
const shot = (p, name) =>
  SHOT_DIR ? p.screenshot({ path: `${SHOT_DIR}/${name}.png` }) : Promise.resolve()
const problems = []
const fail = (m) => problems.push(m)
const note = (m) => console.log(`  ${m}`)
const check = (cond, okMsg, failMsg) =>
  cond ? note(`ok  ${okMsg}`) : (note(`!!  ${failMsg}`), fail(failMsg))

// ── 1. Raw HTTP: headers and HTML ───────────────────────────────────────────
console.log('HTTP')
const res = await fetch(`${BASE}/en`)
const csp = res.headers.get('content-security-policy') ?? ''
const html = await res.text()
const nonce = csp.match(/'nonce-([^']+)'/)?.[1]
check(Boolean(nonce), `nonce in CSP header`, 'no nonce in CSP')
check(
  /connect-src[^;]*https:\/\/\*\.google-analytics\.com/.test(csp),
  'connect-src allows *.google-analytics.com',
  'connect-src missing GA',
)
check(
  /script-src[^;]*https:\/\/www\.googletagmanager\.com/.test(csp),
  'script-src lists googletagmanager',
  'script-src missing GTM',
)
check(
  /script-src[^;]*'strict-dynamic'/.test(csp) && !/script-src[^;]*'unsafe-inline'/.test(csp),
  'script-src still nonce + strict-dynamic, no unsafe-inline',
  'script-src loosened',
)
check(
  !csp.includes('doubleclick') && !/https:\/\/\*\.google\.com/.test(csp),
  'no ads hosts in CSP',
  'ads hosts in CSP',
)
const gtagTag =
  html.match(
    /<script[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=([^"]+)"[^>]*>/,
  )?.[0] ?? ''
check(gtagTag.includes(`id=${GA}`), `gtag.js tag for ${GA}`, 'gtag.js tag missing')
check(
  gtagTag.includes(`nonce="${nonce}"`),
  'gtag.js tag carries the page nonce',
  'gtag.js tag has no/incorrect nonce',
)
const bootstrap =
  html.match(
    /<script[^>]*nonce="[^"]+"[^>]*>window\.dataLayer=window\.dataLayer\|\|\[\];[^<]*<\/script>/,
  )?.[0] ?? ''
check(
  bootstrap.includes(`nonce="${nonce}"`),
  'inline consent bootstrap carries the nonce',
  'inline bootstrap missing or without nonce',
)
check(
  bootstrap.includes(
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:c==='granted'?'granted':'denied'})",
  ),
  'consent default denied before config',
  'consent default wrong',
)
check(
  bootstrap.indexOf("'consent','default'") < bootstrap.indexOf("'config'"),
  'consent default precedes config',
  'config before consent default',
)
check(
  html.includes(
    `<meta name="google-site-verification" content="${process.env.GOOGLE_SITE_VERIFICATION}"`,
  ),
  'google-site-verification meta present',
  'google meta missing',
)
check(
  html.includes(`<meta name="msvalidate.01" content="${process.env.BING_SITE_VERIFICATION}"`),
  'msvalidate.01 meta present',
  'bing meta missing',
)
check(
  html.indexOf('google-site-verification') < html.indexOf('</head>'),
  'verification meta is inside <head>',
  'verification meta not in head',
)
check(
  !html.includes('aria-label="Cookie consent"'),
  'banner not in server HTML (client decides)',
  'banner rendered server-side',
)
const ar = await (await fetch(`${BASE}/`)).text()
check(
  ar.includes('google-site-verification') && ar.includes(`id=${GA}`),
  'Arabic home carries meta + tag too',
  'Arabic home missing tag/meta',
)
const gone = await fetch(`${BASE}/japan-togel-x-boeing-777300-air-france-siege/`, {
  redirect: 'manual',
})
check(gone.status === 410, 'an indexed spam URL answers 410', `spam URL answered ${gone.status}`)
const sitemap = await fetch(`${BASE}/sitemap.xml`)
check(
  sitemap.status === 200 && (await sitemap.text()).includes('<loc>'),
  'sitemap.xml answers',
  'sitemap missing',
)

// ── 2. Browser ───────────────────────────────────────────────────────────────
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  userAgent:
    'Mozilla/5.0 (Linux; Android 12; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
})
const cspViolations = [],
  jsErrors = [],
  gtagRequests = []
context.on('page', (page) => {
  page.on('console', (msg) => {
    const text = msg.text()
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(text))
      cspViolations.push(text)
    else if (msg.type() === 'error' && !/Failed to load resource/.test(text)) jsErrors.push(text)
  })
  page.on('pageerror', (e) => jsErrors.push(String(e)))
})
// The sandbox cannot reach Google; serve a stub so the tag "loads" and we can
// tell the nonce let it execute. The stub records that it ran.
await context.route('**/gtag/js**', (route) => {
  gtagRequests.push(route.request().url())
  route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.__gtagStubRan=true;',
  })
})
const page = await context.newPage()
const dl = () => page.evaluate(() => (window.dataLayer ?? []).map((a) => Array.from(a)))
const cookies = async () => (await context.cookies()).map((c) => c.name)

console.log('\nBanner, mobile, English')
await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' })
check(
  await page.evaluate(() => window.__gtagStubRan === true),
  'gtag.js executed under the CSP (nonce honoured)',
  'gtag.js did not execute',
)
const tagged = await page.evaluate(() =>
  Array.from(document.querySelectorAll('a[data-analytics-event="whatsapp_click"]')).map(
    (a) => a.dataset.analyticsLocation,
  ),
)
check(
  ['floating', 'header', 'hero', 'footer', 'home_contact', 'mobile_menu'].every((l) =>
    tagged.includes(l),
  ),
  `WhatsApp links tagged on the home page: ${tagged.join(', ')}`,
  `WhatsApp links missing tags; found: ${tagged.join(', ')}`,
)
const region = page.getByRole('region', { name: 'Cookie consent' })
check(await region.isVisible(), 'consent banner visible', 'banner not visible')
const bannerBox = await region.boundingBox()
check(
  bannerBox && bannerBox.y + bannerBox.height >= 843,
  'banner sits at the bottom of the viewport',
  'banner not at bottom',
)
check(
  bannerBox && bannerBox.height < 260,
  `banner height ${Math.round(bannerBox?.height ?? 0)}px (compact)`,
  'banner too tall on mobile',
)
const offset = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--consent-offset').trim(),
)
check(
  parseFloat(offset) > 0 && Math.abs(parseFloat(offset) - (bannerBox?.height ?? 0)) < 2,
  `--consent-offset = ${offset}`,
  `offset ${offset} does not match banner height`,
)
const fab = page.locator('a[data-analytics-location="floating"]')
const fabBox = await fab.boundingBox()
check(
  fabBox && bannerBox && fabBox.y + fabBox.height <= bannerBox.y + 1,
  'WhatsApp button sits above the banner (not covered)',
  'WhatsApp button is covered by the banner',
)
let layer = await dl()
check(
  layer.some(
    (a) => a[0] === 'consent' && a[1] === 'default' && a[2]?.analytics_storage === 'denied',
  ),
  'dataLayer: consent default denied',
  'consent default missing',
)
check(
  layer.some((a) => a[0] === 'config' && a[1] === GA),
  'dataLayer: config queued',
  'config missing',
)
check(
  !(await cookies()).some((n) => n.startsWith('_ga')),
  'no _ga cookie before consent',
  'a _ga cookie exists before consent',
)
check(
  (await page.evaluate(() => localStorage.getItem('hgp-consent'))) === null,
  'no stored choice yet',
  'choice stored too early',
)

// WhatsApp click (stop the navigation, keep the event)
await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault(), true))
await fab.click()
layer = await dl()
check(
  layer.some((a) => a[0] === 'event' && a[1] === 'whatsapp_click' && a[2]?.location === 'floating'),
  'event whatsapp_click {location: floating}',
  'whatsapp_click not sent',
)

// Accept
await page.getByRole('button', { name: 'Accept' }).click()
check(
  !(await region.isVisible().catch(() => false)),
  'banner gone after Accept',
  'banner still visible',
)
check(
  (await page.evaluate(() => localStorage.getItem('hgp-consent'))) === 'granted',
  'stored: granted',
  'choice not stored',
)
layer = await dl()
check(
  layer.some(
    (a) =>
      a[0] === 'consent' &&
      a[1] === 'update' &&
      a[2]?.analytics_storage === 'granted' &&
      a[2]?.ad_storage === 'denied',
  ),
  'dataLayer: consent update analytics granted, ads denied',
  'consent update wrong',
)
check(
  (await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--consent-offset').trim(),
  )) === '',
  'offset removed after answer',
  'offset still set',
)
const fabAfter = await fab.boundingBox()
check(
  fabAfter && fabAfter.y + fabAfter.height > 800,
  'WhatsApp button back in its corner',
  'WhatsApp button did not return',
)

// Return visit: no banner, default restored to granted
await page.reload({ waitUntil: 'networkidle' })
check(
  !(await page
    .getByRole('region', { name: 'Cookie consent' })
    .isVisible()
    .catch(() => false)),
  'return visit: no banner',
  'banner shown again',
)
layer = await dl()
check(
  layer.some(
    (a) => a[0] === 'consent' && a[1] === 'default' && a[2]?.analytics_storage === 'granted',
  ),
  'return visit: default restored to granted',
  'stored choice not restored',
)

// Language switch event
await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault(), true))
await page.locator('a[hreflang="ar"]').first().click()
layer = await dl()
check(
  layer.some(
    (a) =>
      a[0] === 'event' && a[1] === 'language_switch' && a[2]?.from === 'en' && a[2]?.to === 'ar',
  ),
  'event language_switch {from: en, to: ar}',
  'language_switch not sent',
)

// Privacy page control brings the banner back and sets denied
await page.goto(`${BASE}/en/privacy`, { waitUntil: 'networkidle' })
const change = page.getByRole('button', { name: 'Change my choice' })
check(
  await change.isVisible(),
  'privacy page shows the change-choice control',
  'change control missing',
)
await change.click()
check(
  await page.getByRole('region', { name: 'Cookie consent' }).isVisible(),
  'banner returns after clearing',
  'banner did not return',
)
layer = await dl()
check(
  layer.some(
    (a) => a[0] === 'consent' && a[1] === 'update' && a[2]?.analytics_storage === 'denied',
  ),
  'clearing sends consent update denied',
  'no denied update',
)
await page.getByRole('button', { name: 'Essential only' }).click()
check(
  (await page.evaluate(() => localStorage.getItem('hgp-consent'))) === 'denied',
  'stored: denied',
  'denied not stored',
)
check(
  !(await cookies()).some((n) => n.startsWith('_ga')),
  'still no _ga cookie after Essential only',
  '_ga cookie after decline',
)

console.log('\nBanner, Arabic')
await page.evaluate(() => localStorage.clear())
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
const arRegion = page.getByRole('region', { name: 'الموافقة على ملفات تعريف الارتباط' })
check(await arRegion.isVisible(), 'Arabic banner visible', 'Arabic banner missing')
check(
  (await arRegion.textContent())?.includes('الضروري فقط'),
  'Arabic labels',
  'Arabic labels missing',
)
await shot(page, 'banner-ar-mobile')
await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' })
await shot(page, 'banner-en-mobile')

console.log('\nDesktop')
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await desktop.route('**/gtag/js**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
)
const dpage = await desktop.newPage()
await dpage.goto(`${BASE}/en`, { waitUntil: 'networkidle' })
const dregion = dpage.getByRole('region', { name: 'Cookie consent' })
const dbox = await dregion.boundingBox()
check(
  dbox && dbox.width <= 400 && dbox.x < 40,
  `desktop: card ${Math.round(dbox?.width ?? 0)}px wide at the start edge`,
  'desktop banner not a corner card',
)
check(
  (await dpage.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--consent-offset').trim(),
  )) === '0px',
  'desktop: no WhatsApp offset',
  'desktop offset set',
)
await shot(dpage, 'banner-en-desktop')
await dpage.goto(`${BASE}/`, { waitUntil: 'networkidle' })
const arbox = await dpage
  .getByRole('region', { name: 'الموافقة على ملفات تعريف الارتباط' })
  .boundingBox()
check(
  arbox && arbox.x + arbox.width > 1400,
  'desktop Arabic: card at the right (start) edge',
  'Arabic card not at start edge',
)
await shot(dpage, 'banner-ar-desktop')

console.log('\nEnquiry form event')
await page.goto(`${BASE}/en/contact`, { waitUntil: 'networkidle' })
await page
  .getByRole('button', { name: 'Accept' })
  .click()
  .catch(() => {})
await page.locator('input[name="name"]').fill('GA test')
await page.locator('select[name="country"]').selectOption({ index: 1 })
await page.locator('input[name="whatsapp"]').fill('+966501234567')
await page
  .locator('textarea[name="message"]')
  .fill('Testing the analytics event on the enquiry form, nothing else.')
await page.waitForTimeout(3500)
await page.locator('button[type="submit"]').click()
await page.getByRole('status').waitFor({ timeout: 15000 })
layer = await dl()
const sent = layer.filter((a) => a[0] === 'event' && a[1] === 'enquiry_sent')
check(
  sent.length === 1,
  `event enquiry_sent sent exactly once (${JSON.stringify(sent[0]?.[2])})`,
  `enquiry_sent sent ${sent.length} times`,
)

console.log('\nApplication form event')
await page.goto(`${BASE}/en/apply/consultation`, { waitUntil: 'networkidle' })
await page
  .getByRole('button', { name: 'Accept' })
  .click()
  .catch(() => {})
// The form is stepped once hydrated. Fill whatever the current step shows,
// press "next" while there is one, then submit.
for (let step = 0; step < 8; step++) {
  await page.evaluate(() => {
    const visible = (el) => el.getClientRects().length > 0
    for (const el of document.querySelectorAll('form [name]')) {
      if (!visible(el) || el.type === 'hidden' || el.name === 'company_website') continue
      const set = (value) => {
        const proto =
          el.tagName === 'SELECT'
            ? HTMLSelectElement
            : el.tagName === 'TEXTAREA'
              ? HTMLTextAreaElement
              : HTMLInputElement
        Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }
      if (el.tagName === 'SELECT') {
        const option = Array.from(el.options).find((o) => o.value && !o.disabled)
        if (option && !el.value) set(option.value)
      } else if (el.type === 'radio' || el.type === 'checkbox') {
        const group = document.querySelectorAll(`form [name="${el.name}"]`)
        if (!Array.from(group).some((g) => g.checked)) el.click()
      } else if (el.type === 'tel') set('+966501234567')
      else if (el.type === 'email') set('ga-test@example.invalid')
      else if (el.type === 'number') set('3')
      else if (el.type === 'date') set('2026-12-01')
      else if (!el.value)
        set(
          el.tagName === 'TEXTAREA'
            ? 'Testing the analytics event on the application form, nothing else.'
            : 'GA test value',
        )
    }
  })
  const next = page
    .locator('form button[type="button"]:not([aria-label*="close" i])')
    .filter({ hasText: /^Continue$/ })
  if ((await next.count()) > 0 && (await next.first().isVisible())) {
    await next.first().click()
    await page.waitForTimeout(150)
    continue
  }
  break
}
await page.waitForTimeout(3500)
await page.locator('form button[type="submit"]').click()
await page.getByRole('status').waitFor({ timeout: 15000 })
layer = await dl()
const appSent = layer.filter((a) => a[0] === 'event' && a[1] === 'application_sent')
check(
  appSent.length === 1 && appSent[0][2]?.application_type === 'consultation',
  `event application_sent sent exactly once (${JSON.stringify(appSent[0]?.[2])})`,
  `application_sent sent ${appSent.length} times`,
)

console.log('\nSummary')
note(`gtag.js requested ${gtagRequests.length} time(s)`)
note(`CSP violations: ${cspViolations.length}`)
for (const v of cspViolations.slice(0, 5)) console.log(`    ! ${v}`)
note(`JavaScript errors: ${jsErrors.length}`)
for (const e of jsErrors.slice(0, 5)) console.log(`    ! ${e}`)
if (cspViolations.length) fail(`${cspViolations.length} CSP violation(s)`)
if (jsErrors.length) fail(`${jsErrors.length} JS error(s)`)
await browser.close()
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`)
  for (const p of problems) console.log(`  - ${p}`)
  process.exit(1)
}
console.log('\nAll checks passed')
