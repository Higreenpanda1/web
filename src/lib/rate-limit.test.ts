import assert from 'node:assert/strict'
import { test } from 'node:test'

import { __reset, consume, networkPrefix, peek } from './rate-limit.ts'

test('allows up to the limit then refuses', () => {
  __reset()
  const now = 1_000_000
  for (let i = 0; i < 3; i += 1) {
    assert.equal(consume('a', 3, 60_000, now).allowed, true, `call ${i + 1}`)
  }
  const blocked = consume('a', 3, 60_000, now)
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.remaining, 0)
  assert.equal(blocked.retryAfterSeconds, 60)
})

test('opens a fresh window once the old one expires', () => {
  __reset()
  const now = 1_000_000
  consume('b', 1, 60_000, now)
  assert.equal(consume('b', 1, 60_000, now).allowed, false)
  assert.equal(consume('b', 1, 60_000, now + 60_001).allowed, true)
})

test('keys are independent', () => {
  __reset()
  const now = 1_000_000
  consume('c', 1, 60_000, now)
  assert.equal(consume('c', 1, 60_000, now).allowed, false)
  assert.equal(consume('d', 1, 60_000, now).allowed, true)
})

test('reports remaining accurately', () => {
  __reset()
  const now = 1_000_000
  assert.equal(consume('e', 5, 60_000, now).remaining, 4)
  assert.equal(consume('e', 5, 60_000, now).remaining, 3)
})

test('network prefix keeps a network and drops the host', () => {
  assert.equal(networkPrefix('203.0.113.42'), '203.0.113.0/24')
  assert.equal(networkPrefix('203.0.113.42, 70.41.3.18'), '203.0.113.0/24')
  assert.equal(networkPrefix('2001:db8:85a3:8d3:1319:8a2e:370:7348'), '2001:db8:85a3::/48')
  assert.equal(networkPrefix(null), 'unknown')
  assert.equal(networkPrefix(''), 'unknown')
  assert.equal(networkPrefix('not-an-address'), 'unknown')
})

test('peek reports the budget without spending it', () => {
  __reset()
  const now = 1_000_000
  // Peeking a fresh key never records an attempt.
  for (let i = 0; i < 10; i += 1) {
    assert.equal(peek('p', 2, now).allowed, true, `peek ${i + 1}`)
  }
  assert.equal(consume('p', 2, 60_000, now).allowed, true)
  assert.equal(peek('p', 2, now).allowed, true)
  assert.equal(consume('p', 2, 60_000, now).allowed, true)
  // The budget is now spent, and peek says so without spending more.
  assert.equal(peek('p', 2, now).allowed, false)
  assert.equal(peek('p', 2, now).retryAfterSeconds, 60)
})

test('peek sees a window that has expired as fresh', () => {
  __reset()
  const now = 1_000_000
  consume('q', 1, 60_000, now)
  assert.equal(peek('q', 1, now).allowed, false)
  assert.equal(peek('q', 1, now + 60_001).allowed, true)
})
