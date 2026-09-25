import assert from 'node:assert/strict'
import { test } from 'node:test'

import { latestValue } from './metricool-timeline.ts'

test('takes the most recent point, whatever order Metricool sends', () => {
  const body = {
    data: [
      {
        metric: 'followers',
        values: [
          { dateTime: '2026-09-22T00:00:00+08:00', value: 44682 },
          { dateTime: '2026-09-24T00:00:00+08:00', value: 44710 },
          { dateTime: '2026-09-23T00:00:00+08:00', value: 44674 },
        ],
      },
    ],
  }
  assert.equal(latestValue(body), 44710)
})

test('accepts a flat list and string values', () => {
  assert.equal(latestValue({ data: [{ dateTime: '2026-09-24', value: '28700.0' }] }), 28700)
})

test('returns null when there is nothing to read', () => {
  assert.equal(latestValue({ data: [] }), null)
  assert.equal(latestValue({ data: [{ dateTime: '2026-09-24', value: null }] }), null)
  assert.equal(latestValue(null), null)
})
