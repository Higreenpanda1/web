import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildCsp, GOOGLE_ANALYTICS_SOURCES } from './security-headers.ts'

const NONCE = 'dGVzdC1ub25jZQ=='

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split(';').map((entry) => {
      const [name = '', ...values] = entry.trim().split(/\s+/)
      return [name, values] as const
    }),
  )
}

test('the production policy is strict: nonce + strict-dynamic, no unsafe-inline for scripts', () => {
  const csp = directives(buildCsp(NONCE, true))
  assert.deepEqual(csp.get('script-src'), ["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'"])
  assert.deepEqual(csp.get('connect-src'), ["'self'"])
  assert.deepEqual(csp.get('img-src'), ["'self'", 'data:', 'blob:'])
  assert.deepEqual(csp.get('object-src'), ["'none'"])
  assert.deepEqual(csp.get('frame-ancestors'), ["'none'"])
  assert.ok(csp.has('upgrade-insecure-requests'))
})

test('switching Google Analytics on adds only the Google origins, to only three directives', () => {
  const before = directives(buildCsp(NONCE, true))
  const after = directives(buildCsp(NONCE, true, { googleAnalytics: true }))

  assert.deepEqual([...after.keys()], [...before.keys()], 'no directive added or removed')

  for (const [name, values] of before) {
    const added = (after.get(name) ?? []).filter((value) => !values.includes(value))
    const removed = values.filter((value) => !(after.get(name) ?? []).includes(value))
    assert.deepEqual(removed, [], `${name} lost a value`)
    const expected = GOOGLE_ANALYTICS_SOURCES[name as keyof typeof GOOGLE_ANALYTICS_SOURCES] ?? []
    assert.deepEqual(added, [...expected], `${name} gained something unexpected`)
  }

  // The nonce is still what lets the tag itself execute.
  assert.ok(after.get('script-src')?.includes(`'nonce-${NONCE}'`))
  assert.ok(after.get('script-src')?.includes("'strict-dynamic'"))
  assert.ok(!after.get('script-src')?.includes("'unsafe-inline'"))
  // No advertising or Google Signals hosts.
  assert.ok(!buildCsp(NONCE, true, { googleAnalytics: true }).includes('doubleclick'))
})

test('without the flag the policy is unchanged by the option object', () => {
  assert.equal(buildCsp(NONCE, true), buildCsp(NONCE, true, {}))
  assert.equal(buildCsp(NONCE, true), buildCsp(NONCE, true, { googleAnalytics: false }))
})
