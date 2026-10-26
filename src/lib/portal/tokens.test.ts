import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  cleanCode,
  codeMatches,
  hashCode,
  hashLinkToken,
  newCode,
  newLinkToken,
  readSession,
  signSession,
} from './tokens.ts'

const SECRET = 'test-secret'

test('a signed session reads back', () => {
  const session = { c: 7, v: 2, e: Date.now() + 60_000 }
  assert.deepEqual(readSession(signSession(session, SECRET), SECRET), session)
})

test('a session signed with another secret, tampered or expired is refused', () => {
  const session = { c: 7, v: 2, e: Date.now() + 60_000 }
  const cookie = signSession(session, SECRET)
  assert.equal(readSession(cookie, 'other'), null)

  const [, mac] = cookie.split('.')
  const forged = Buffer.from(JSON.stringify({ ...session, c: 8 })).toString('base64url')
  assert.equal(readSession(`${forged}.${mac}`, SECRET), null)

  assert.equal(readSession(signSession({ ...session, e: Date.now() - 1 }, SECRET), SECRET), null)
  assert.equal(readSession('garbage', SECRET), null)
  assert.equal(readSession(undefined, SECRET), null)
  assert.equal(readSession(cookie, ''), null)
})

test('codes are six digits and match only their customer', () => {
  for (let i = 0; i < 50; i++) assert.match(newCode(), /^\d{6}$/)
  const stored = hashCode(5, '012345', SECRET)
  assert.ok(codeMatches(5, '012345', stored, SECRET))
  assert.ok(!codeMatches(6, '012345', stored, SECRET))
  assert.ok(!codeMatches(5, '012346', stored, SECRET))
})

test('codes typed with Arabic digits or spaces still read', () => {
  assert.equal(cleanCode('١٢٣ ٤٥٦'), '123456')
  assert.equal(cleanCode(' 12-34 56 '), '123456')
  assert.equal(cleanCode('۰۱۲۳۴۵'), '012345')
})

test('link tokens are long and stored only as a hash', () => {
  const token = newLinkToken()
  assert.ok(token.length >= 43)
  assert.notEqual(hashLinkToken(token, SECRET), token)
  assert.equal(hashLinkToken(token, SECRET), hashLinkToken(token, SECRET))
})
