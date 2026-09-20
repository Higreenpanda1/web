import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  base32Decode,
  base32Encode,
  generateBackupCodes,
  generateSecret,
  generateToken,
  otpauthUrl,
  verifyToken,
} from './totp.ts'

test('base32 round-trips arbitrary bytes', () => {
  for (const length of [1, 2, 5, 10, 20, 32]) {
    const input = Buffer.from(Array.from({ length }, (_, i) => (i * 37 + 11) % 256))
    assert.deepEqual(base32Decode(base32Encode(input)), input)
  }
})

test('matches the RFC 4648 base32 test vectors', () => {
  assert.equal(base32Encode(Buffer.from('foobar')), 'MZXW6YTBOI')
  assert.equal(base32Decode('MZXW6YTBOI').toString(), 'foobar')
})

test('matches the RFC 6238 SHA-1 test vectors', () => {
  // RFC 6238 appendix B uses the ASCII secret "12345678901234567890".
  const secret = base32Encode(Buffer.from('12345678901234567890'))
  // The RFC prints 8 digits; this implementation emits the low 6 of the same value.
  const vectors: Array<[number, string]> = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ]
  for (const [seconds, expected] of vectors) {
    assert.equal(generateToken(secret, seconds * 1000), expected, `at t=${seconds}`)
  }
})

test('verifies the current token and tolerates one window of drift', () => {
  const secret = generateSecret()
  const now = 1_700_000_000_000
  assert.equal(verifyToken(generateToken(secret, now), secret, now), true)
  assert.equal(verifyToken(generateToken(secret, now - 30_000), secret, now), true)
  assert.equal(verifyToken(generateToken(secret, now + 30_000), secret, now), true)
})

test('rejects tokens outside the drift window', () => {
  const secret = generateSecret()
  const now = 1_700_000_000_000
  assert.equal(verifyToken(generateToken(secret, now - 120_000), secret, now), false)
  assert.equal(verifyToken(generateToken(secret, now + 120_000), secret, now), false)
})

test('rejects malformed input without throwing', () => {
  const secret = generateSecret()
  for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 56', '000000000']) {
    assert.equal(verifyToken(bad, secret), false, `rejects ${JSON.stringify(bad)}`)
  }
  assert.equal(verifyToken('123456', 'not!valid!base32'), false)
  assert.equal(verifyToken('123456', ''), false)
})

test('secrets and backup codes have the documented shape', () => {
  assert.match(generateSecret(), /^[A-Z2-7]{32}$/)
  const codes = generateBackupCodes(10)
  assert.equal(codes.length, 10)
  assert.equal(new Set(codes).size, 10)
  for (const code of codes) assert.match(code, /^\d{5}-\d{5}$/)
})

test('otpauth url carries the parameters an authenticator needs', () => {
  const url = new URL(otpauthUrl('JBSWY3DPEHPK3PXP', 'admin@higreenpanda.com'))
  assert.equal(url.protocol, 'otpauth:')
  assert.equal(url.searchParams.get('secret'), 'JBSWY3DPEHPK3PXP')
  assert.equal(url.searchParams.get('issuer'), 'HiGreenPanda')
  assert.equal(url.searchParams.get('digits'), '6')
  assert.equal(url.searchParams.get('period'), '30')
})
