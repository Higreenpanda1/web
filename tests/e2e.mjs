/**
 * Browser checks against a running server.
 *
 *   npm run build && npm start        # or npm run dev
 *   npm run test:e2e                  # BASE=http://127.0.0.1:3000 by default
 *
 * These cover the things that only break in a real browser and that this site
 * cannot afford to get wrong: the Arabic type scale, RTL layout at phone width,
 * the language switcher staying on the page, the enquiry form actually storing
 * a lead, the keyboard entry point, and whether the strict CSP blocks anything.
 *
 * Deliberately not a test framework. It is one file, it needs no config, and it
 * runs anywhere Playwright and a server exist.
 */
import { chromium } from 'playwright'

const BASE = (process.env.BASE ?? 'http://127.0.0.1:3000').replace(/\/+$/, '')
const problems = []
const fail = (message) => problems.push(message)
const note = (message) => console.log(`  ${message}`)

const browser = await chromium.launch()
const context = await browser.newContext({
  // A mid-range Android over 4G is the real audience (brief section 7).
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  userAgent:
    'Mozilla/5.0 (Linux; Android 12; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
})

const cspViolations = []
const jsErrors = []
context.on('page', (page) => {
  page.on('console', (msg) => {
    const text = msg.text()
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(text)) {
      cspViolations.push(text)
    } else if (msg.type() === 'error' && !/Failed to load resource/.test(text)) {
      // A "failed to load resource" line is the browser reporting an HTTP
      // status, not a script error — and one of these checks asks for a 410.
      jsErrors.push(text)
    }
  })
  page.on('pageerror', (error) => jsErrors.push(String(error)))
})

const page = await context.newPage()

// ── Every route answers ──────────────────────────────────────────────────────
// Cheap, and it catches the failure mode that hurts most: a page that builds
// cleanly and then 500s in production only. The blog posts did exactly that
// once, because a detail route asked to be prerendered inside a layout that
// cannot be.
console.log('Routes')
const ROUTES = [
  ['/', 200],
  ['/en', 200],
  ['/services', 200],
  ['/services/full-import-management', 200],
  ['/en/services/product-sourcing', 200],
  ['/services/business-invitation-letter', 200],
  ['/en/services/trademark-registration', 200],
  ['/apply/company-registration', 200],
  ['/en/apply/visa-invitation?service=business-invitation-letter', 200],
  ['/apply/not-a-form', 404],
  ['/blog', 200],
  ['/en/blog', 200],
  ['/blog/how-to-inspect-a-factory-before-you-pay', 200],
  ['/about', 200],
  ['/en/about', 200],
  ['/contact', 200],
  ['/privacy', 200],
  ['/terms', 200],
  ['/sitemap.xml', 200],
  ['/robots.txt', 200],
  ['/manifest.webmanifest', 200],
  ['/api/health', 200],
  // Migration and clean-up behaviour, not just availability. These two read the
  // redirect table from the database on the first request after a cold start,
  // which is how a build-time-prerendered empty table was caught.
  ['/en/home/', 200], // 301 to /en, followed
  ['/about-us/', 200], // 301 to /about, followed
  ['/slot-gacor', 410],
  ['/wp-admin/', 410],
  ['/admin', 404],
  ['/this-page-does-not-exist', 404],
]

for (const [path, expected] of ROUTES) {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  const status = response?.status()
  if (status !== expected) {
    fail(`${path} returned ${status}, expected ${expected}`)
    note(`${path} → ${status}  ✗ expected ${expected}`)
  }
}
note(`${ROUTES.length} routes checked`)

// ── Arabic is the site, not a translation ────────────────────────────────────
console.log('\nArabic homepage')
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })

const dir = await page.getAttribute('html', 'dir')
const lang = await page.getAttribute('html', 'lang')
note(`dir=${dir} lang=${lang}`)
if (dir !== 'rtl') fail('The Arabic homepage is not dir="rtl"')
if (lang !== 'ar') fail('The Arabic homepage is not lang="ar"')

// Brief section 13: Arabic one step larger, line height 1.9.
const arType = await page.evaluate(() => {
  const body = getComputedStyle(document.body)
  const root = getComputedStyle(document.documentElement)
  return {
    fontSize: parseFloat(body.fontSize),
    lineHeight: parseFloat(body.lineHeight),
    brand600: root.getPropertyValue('--brand-600').trim(),
    textBrand: root.getPropertyValue('--text-brand').trim(),
  }
})
note(`body ${arType.fontSize}px / ${(arType.lineHeight / arType.fontSize).toFixed(2)}`)
if (arType.fontSize !== 19) fail(`Arabic body should be 19px, got ${arType.fontSize}px`)
if (Math.abs(arType.lineHeight / arType.fontSize - 1.9) > 0.02) {
  fail(`Arabic line-height should be 1.9, got ${(arType.lineHeight / arType.fontSize).toFixed(2)}`)
}

// Brief section 12: the contrast rule, asserted rather than trusted.
note(`--brand-600=${arType.brand600} --text-brand=${arType.textBrand}`)
if (arType.brand600 !== '#378d42')
  fail(`--brand-600 must be the logo green, got ${arType.brand600}`)
if (arType.textBrand !== '#276b34') {
  fail(`--text-brand must be --brand-700 (6.48:1), got ${arType.textBrand}`)
}

const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
)
note(`horizontal overflow ${overflow}px`)
if (overflow > 1) fail(`The Arabic homepage overflows horizontally by ${overflow}px at 390px wide`)

// The WhatsApp button belongs at the inline-end, which is the LEFT in Arabic.
const whatsapp = await page.locator('a[href*="wa.me"]').last().boundingBox()
if (!whatsapp) fail('No WhatsApp button on the Arabic homepage')
else {
  note(`WhatsApp button x=${Math.round(whatsapp.x)}`)
  if (whatsapp.x > 195) fail('The WhatsApp button should sit at the inline-end (left) in RTL')
}

// ── The switcher must stay on the equivalent page ────────────────────────────
console.log('\nLanguage switcher')
await page.goto(`${BASE}/services/full-import-management`, { waitUntil: 'networkidle' })
await page.locator('a[hreflang="en"]').first().click()
try {
  await page.waitForURL('**/en/services/full-import-management', { timeout: 15000 })
} catch {
  fail(`The switcher left the page: ended on ${new URL(page.url()).pathname}`)
}
note(new URL(page.url()).pathname)

if ((await page.getAttribute('html', 'dir')) !== 'ltr') fail('The English page is not dir="ltr"')
const enSize = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize))
note(`English body ${enSize}px`)
if (enSize !== 17) fail(`English body should be 17px, got ${enSize}px`)

// ── An enquiry has to reach the database ─────────────────────────────────────
console.log('\nEnquiry form')
await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' })

// Inspect the honeypot before submitting — afterwards the form is gone.
const honeypot = await page.evaluate(() => {
  const field = document.querySelector('input[name="company_website"]')
  if (!field) return 'missing'
  const box = field.getBoundingClientRect()
  const onScreen = box.width > 1 && box.height > 1 && box.right > 0 && box.bottom > 0
  return onScreen ? 'visible to people' : 'hidden'
})
note(`honeypot ${honeypot}`)
if (honeypot !== 'hidden') fail(`The honeypot field is ${honeypot}`)

const formToken = await page.getAttribute('input[name="form_token"]', 'value')
note(`form token ${formToken ? 'issued' : 'MISSING'}`)
if (!formToken) fail('The form carries no signed timing token')

await page.locator('input[name="name"]').fill('سامي التجريبي')
await page.locator('select[name="country"]').selectOption({ label: 'السعودية' })
await page.locator('input[name="whatsapp"]').fill('+966501234567')
await page.locator('select[name="service"]').selectOption({ index: 1 })
await page
  .locator('textarea[name="message"]')
  .fill('أبحث عن مورد لأكواب عازلة للحرارة، كمية 5000 قطعة، الشحن إلى جدة.')

// The timing guard refuses anything faster than a person can type.
await page.waitForTimeout(3500)
await page.locator('button[type="submit"]').click()
await page.waitForSelector('[role="status"]', { timeout: 30000 })
const success = (await page.locator('[role="status"]').textContent())?.replace(/\s+/g, ' ').trim()
const reference = success?.match(/HGP-\d{8}-[0-9A-F]{6}/)?.[0]
note(reference ? `stored as ${reference}` : `no reference in: ${success?.slice(0, 80)}`)
if (!reference) fail('The enquiry form did not return a reference')

// ── Keyboard ─────────────────────────────────────────────────────────────────
console.log('\nKeyboard and 410')
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await page.keyboard.press('Tab')
const firstStop = await page.evaluate(() => ({
  className: String(document.activeElement?.className ?? ''),
  text: document.activeElement?.textContent?.trim(),
}))
note(`first tab stop: "${firstStop.text}"`)
if (!firstStop.className.includes('skip-link')) {
  fail('The skip link is not the first thing in the tab order')
}

const gone = await page.goto(`${BASE}/slot-gacor`)
note(`/slot-gacor → ${gone?.status()}`)
if (gone?.status() !== 410) fail(`An injected spam path returned ${gone?.status()}, expected 410`)

// ── Dark mode ────────────────────────────────────────────────────────────────
console.log('\nDark mode')
const darkPage = await context.newPage()
await darkPage.emulateMedia({ colorScheme: 'dark' })
await darkPage.goto(`${BASE}/`, { waitUntil: 'networkidle' })
const darkBackground = await darkPage.evaluate(
  () => getComputedStyle(document.body).backgroundColor,
)
note(`canvas ${darkBackground}`)
if (darkBackground !== 'rgb(14, 20, 16)') {
  fail(`Dark mode canvas should be #0E1410, got ${darkBackground}`)
}

// ── Nothing the policy blocks, nothing that throws ───────────────────────────
console.log('\nConsole')
note(`CSP violations: ${cspViolations.length}`)
for (const violation of cspViolations.slice(0, 5)) console.log(`    ! ${violation}`)
note(`JavaScript errors: ${jsErrors.length}`)
for (const error of jsErrors.slice(0, 5)) console.log(`    ! ${error.slice(0, 160)}`)
if (cspViolations.length > 0) fail(`${cspViolations.length} CSP violation(s)`)
if (jsErrors.length > 0) fail(`${jsErrors.length} JavaScript error(s)`)

await browser.close()

console.log(`\n${'─'.repeat(64)}`)
if (problems.length === 0) {
  console.log('All browser checks passed.')
} else {
  console.log(`${problems.length} problem(s):`)
  for (const problem of problems) console.log(`  · ${problem}`)
  process.exitCode = 1
}
