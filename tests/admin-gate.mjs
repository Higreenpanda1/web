/**
 * Checks that the admin panel is actually protected.
 *
 * Not part of `npm run test:e2e`, because it needs a real enrolled TOTP secret
 * and a real password — CI has neither, and giving it them would mean putting
 * admin credentials in a pipeline. Run it by hand after any change to
 * authentication, and after the first deploy.
 *
 *   ADMIN_EMAIL=admin@higreenpanda.com \
 *   ADMIN_PASSWORD=... \
 *   ADMIN_TOTP_SECRET=... \
 *   BASE=https://higreenpanda.com \
 *   node tests/admin-gate.mjs
 *
 * The secret is the base32 string printed by `npm run totp:enrol`. Pass
 * ADMIN_BACKUP_CODE as well to check that a backup code works exactly once —
 * it will be consumed, so use one you are willing to spend.
 *
 * Note that this makes four sign-in attempts. Only failures count against the
 * gate's rate limit, so repeated runs are fine, but a run that deliberately
 * fails several times can still approach it.
 *
 * It verifies, in order:
 *   1. /hgp-studio redirects to the gate when not signed in
 *   2. /admin is not a route
 *   3. a password-only REST login is refused
 *   4. the right password with the wrong code is refused
 *   5. the right password with the right code reaches the panel
 *   6. a backup code works once and is then refused
 */
import { chromium } from 'playwright'

import { generateToken } from '../src/lib/totp.ts'

const BASE = (process.env.BASE ?? 'http://127.0.0.1:3000').replace(/\/+$/, '')
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD
const SECRET = process.env.ADMIN_TOTP_SECRET
const BACKUP_CODE = process.env.ADMIN_BACKUP_CODE

if (!EMAIL || !PASSWORD || !SECRET) {
  console.error('Set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_TOTP_SECRET. See the header.')
  process.exit(1)
}

const problems = []
const fail = (message) => problems.push(message)
const note = (message) => console.log(`  ${message}`)

const browser = await chromium.launch()
const cspViolations = []

/** One sign-in attempt in a clean browser context. */
async function signIn(code, label) {
  const context = await browser.newContext()
  const page = await context.newPage()
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) cspViolations.push(msg.text())
  })

  await page.goto(`${BASE}/hgp-studio-gate`, { waitUntil: 'networkidle' })
  await page.fill('#gate-email', EMAIL)
  await page.fill('#gate-password', PASSWORD)
  await page.fill('#gate-code', code)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(8000)

  const pathname = new URL(page.url()).pathname
  const alert = (await page.locator('[role="alert"]').count())
    ? ((await page.locator('[role="alert"]').first().textContent()) ?? '').trim()
    : ''
  const reachedPanel = pathname.startsWith('/hgp-studio') && !pathname.startsWith('/hgp-studio-gate')
  // Distinguish "refused" from "rate limited" — reporting the second as the
  // first sends whoever runs this looking for a bug in the wrong place.
  const rateLimited = /too many attempts/i.test(alert)
  note(`${label.padEnd(28)} → ${pathname}${alert ? `  "${alert}"` : ''}`)
  return { page, context, reachedPanel, rateLimited }
}

console.log('\nUnauthenticated access')
{
  const context = await browser.newContext()
  const page = await context.newPage()

  const panel = await page.goto(`${BASE}/hgp-studio`, { waitUntil: 'domcontentloaded' })
  const landed = new URL(page.url()).pathname
  note(`/hgp-studio → ${landed}`)
  if (!landed.startsWith('/hgp-studio-gate')) fail('The admin panel is reachable without signing in')
  if (!panel) fail('No response for /hgp-studio')

  const admin = await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' })
  note(`/admin → ${admin?.status()}`)
  if (admin?.status() !== 404) fail(`/admin returned ${admin?.status()}, expected 404`)

  // A password-only REST login must be refused, not just the admin screen.
  const rest = await page.request.post(`${BASE}/api/users/login`, {
    data: { email: EMAIL, password: PASSWORD },
    failOnStatusCode: false,
  })
  note(`POST /api/users/login (no second factor) → ${rest.status()}`)
  if (rest.ok()) fail('A password-only REST login succeeded — the second factor is not enforced')

  await context.close()
}

console.log('\nSign-in gate')
const wrong = await signIn('000000', 'wrong authenticator code')
if (wrong.reachedPanel) fail('A wrong TOTP code reached the admin panel')
await wrong.context.close()

const valid = await signIn(generateToken(SECRET), 'valid authenticator code')
if (valid.rateLimited) fail('Rate limited before the valid code could be checked — wait and re-run')
else if (!valid.reachedPanel) fail('A valid TOTP code did not reach the admin panel')

if (valid.reachedPanel) {
  const body = (await valid.page.textContent('body')) ?? ''
  const expected = ['Services', 'Blog', 'Enquiries', 'Redirects', 'Site settings', 'Staff']
  const missing = expected.filter((name) => !body.includes(name))
  note(`collections visible: ${expected.filter((n) => body.includes(n)).join(', ')}`)
  if (missing.length) fail(`The admin panel does not show: ${missing.join(', ')}`)
}
await valid.context.close()

if (BACKUP_CODE) {
  console.log('\nBackup codes')
  const first = await signIn(BACKUP_CODE, 'backup code, first use')
  if (first.rateLimited) fail('Rate limited before the backup code could be checked — wait and re-run')
  // A spent code and a wrong code are deliberately indistinguishable from the
  // outside, so say so rather than sending someone hunting for a bug.
  else if (!first.reachedPanel)
    fail('The backup code was refused — it is wrong, or it has already been used')
  await first.context.close()

  const reuse = await signIn(BACKUP_CODE, 'backup code, reused')
  if (reuse.reachedPanel) fail('A backup code was accepted twice — they must be single use')
  await reuse.context.close()
} else {
  console.log('\nBackup codes: skipped (set ADMIN_BACKUP_CODE to check)')
}

note(`CSP violations in the admin panel: ${cspViolations.length}`)
if (cspViolations.length) fail(`${cspViolations.length} CSP violation(s) in the admin panel`)

await browser.close()

console.log(`\n${'─'.repeat(64)}`)
if (problems.length === 0) {
  console.log('The admin panel is protected as designed.')
} else {
  console.log(`${problems.length} problem(s):`)
  for (const problem of problems) console.log(`  · ${problem}`)
  process.exitCode = 1
}
