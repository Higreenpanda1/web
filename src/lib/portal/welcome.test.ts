import assert from 'node:assert/strict'
import { test } from 'node:test'

import { welcomeEmail } from './welcome.ts'

const urls = {
  ar: 'https://higreenpanda.com/portal/login',
  en: 'https://higreenpanda.com/en/portal/login',
}

test('a paid request names its reference', () => {
  const mail = welcomeEmail({ name: 'Ali', reference: 'HGP-2026-0004', language: 'en', urls })
  assert.equal(mail.subject, 'Your HiGreenPanda client portal is ready')
  assert.match(mail.text, /payment for request HGP-2026-0004/)
  assert.match(mail.html, /href="https:\/\/higreenpanda.com\/en\/portal\/login"/)
})

test('without a reference there is no payment line', () => {
  const mail = welcomeEmail({ name: 'سامح', reference: null, language: 'ar', urls })
  assert.doesNotMatch(mail.text, /دفعتك/)
  assert.match(mail.text, /فتحنا لك حساب/)
})

test('a client we only know from HubSpot gets both languages', () => {
  const mail = welcomeEmail({ name: 'Omar', reference: null, language: 'both', urls })
  assert.match(mail.subject, /جاهز \| Your/)
  assert.match(mail.html, /dir="rtl"[\s\S]*dir="ltr"/)
})

test('names are escaped in the html', () => {
  const mail = welcomeEmail({ name: '<b>x</b>', reference: null, language: 'en', urls })
  assert.doesNotMatch(mail.html, /<b>x<\/b>/)
})
