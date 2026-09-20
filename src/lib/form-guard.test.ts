import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.PAYLOAD_SECRET = 'test-secret-not-used-anywhere-real'

const { MAX_FORM_AGE_MS, MIN_FILL_MS, issueFormToken, verifyFormToken } = await import(
  './form-guard.ts'
)

const NOW = 1_700_000_000_000

test('accepts a token filled in at human speed', () => {
  const token = issueFormToken(NOW)
  assert.deepEqual(verifyFormToken(token, '', NOW + 8_000), { ok: true })
})

test('refuses a filled honeypot whatever the token says', () => {
  const token = issueFormToken(NOW)
  const verdict = verifyFormToken(token, 'http://spam.example', NOW + 8_000)
  assert.deepEqual(verdict, { ok: false, reason: 'honeypot' })
})

test('refuses a submission faster than a person can type', () => {
  const token = issueFormToken(NOW)
  assert.deepEqual(verifyFormToken(token, '', NOW + MIN_FILL_MS - 1), {
    ok: false,
    reason: 'too-fast',
  })
})

test('refuses a harvested token replayed later', () => {
  const token = issueFormToken(NOW)
  assert.deepEqual(verifyFormToken(token, '', NOW + MAX_FORM_AGE_MS + 1), {
    ok: false,
    reason: 'stale',
  })
})

test('refuses a forged or tampered token', () => {
  const token = issueFormToken(NOW)
  const [payload, signature] = token.split('.')
  const cases = [
    `${Number(payload) - 60_000}.${signature}`, // timestamp moved back
    `${payload}.${'0'.repeat(signature!.length)}`, // signature replaced
    `${payload}.deadbeef`, // wrong length
    payload!, // no signature
    'not-a-token',
    '',
  ]
  for (const bad of cases) {
    const verdict = verifyFormToken(bad, '', NOW + 8_000)
    assert.equal(verdict.ok, false, `should refuse ${JSON.stringify(bad)}`)
  }
})

test('refuses a token dated in the future', () => {
  const token = issueFormToken(NOW + 60_000)
  assert.deepEqual(verifyFormToken(token, '', NOW), { ok: false, reason: 'bad-token' })
})

test('refuses non-string tokens without throwing', () => {
  for (const bad of [null, undefined, 42, {}, []]) {
    assert.equal(verifyFormToken(bad, '', NOW).ok, false)
  }
})
