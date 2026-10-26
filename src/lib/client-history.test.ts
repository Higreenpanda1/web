import assert from 'node:assert/strict'
import { test } from 'node:test'

import { clientHistory, requestAmount, sameNumber, type HistorySource } from './client-history.ts'

const base = { details: {}, order: null, billing: null }

const requests: HistorySource[] = [
  {
    ...base,
    id: 3,
    reference: 'HGA-20261020-C',
    type: 'product-search',
    status: 'new',
    whatsapp: '+966501234567',
    createdAt: '2026-10-20T08:00:00.000Z',
    details: { products: [{ productName: 'Office chairs' }] },
    order: {
      currency: 'usd',
      items: [{ productName: 'Office chairs', quantity: 100, unitPrice: 12.5 }],
      total: 1250,
    },
  },
  {
    ...base,
    id: 1,
    reference: 'HGA-20260801-A',
    type: 'company-registration',
    status: 'completed',
    whatsapp: '+966 50 123 4567',
    createdAt: '2026-08-01T10:00:00.000Z',
    billing: { items: [{ service: 'HGP-REG-REMOTE' }] },
  },
  {
    ...base,
    id: 2,
    reference: 'HGA-20260901-B',
    type: 'consultation',
    status: 'spam',
    whatsapp: '+966501234567',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    ...base,
    id: 4,
    reference: 'HGA-20260905-X',
    type: 'consultation',
    status: 'completed',
    whatsapp: '+971501234567',
    createdAt: '2026-09-05T10:00:00.000Z',
  },
]

test('numbers match on digits only', () => {
  assert.ok(sameNumber('+966 50 123 4567', '+966501234567'))
  assert.ok(!sameNumber('+971501234567', '+966501234567'))
  assert.ok(!sameNumber('', ''))
})

test('history: same number only, no spam, oldest first', () => {
  const rows = clientHistory(requests[0]!, requests)
  assert.deepEqual(
    rows.map((row) => [row.reference, row.date, row.status.en]),
    [
      ['HGA-20260801-A', '2026-08-01', 'Completed'],
      ['HGA-20261020-C', '2026-10-20', 'Enquiry'],
    ],
  )
  assert.deepEqual(rows[1]!.products, ['Office chairs'])
  assert.equal(rows[1]!.what.en, 'Purchase of goods')
})

test('values: product total in its currency, services in yuan, none when unpriced', () => {
  assert.equal(requestAmount(requests[0]!), 'USD 1,250')
  assert.equal(requestAmount(requests[1]!), 'CNY 8,200')
  assert.equal(requestAmount(requests[2]!), null)
})
