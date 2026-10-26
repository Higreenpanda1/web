import assert from 'node:assert/strict'
import { test } from 'node:test'

import { portalDocuments } from './documents.ts'
import { progressFor } from './stages.ts'

const items = [{ service: 'other', name: 'Company registration', quantity: 1, unitPrice: 7200 }]
const at = (stage: string) => progressFor(stage, 'higp', 'company_registration')
const NEW = '4392706760'
const QUOTE = '4392706762'
const READY = '4392706770'

test('nothing before the quote is sent, or without lines, or for product orders', () => {
  assert.deepEqual(portalDocuments('company-registration', { items }, at(NEW)), [])
  assert.deepEqual(portalDocuments('company-registration', { items: [] }, at(QUOTE)), [])
  assert.deepEqual(portalDocuments('product-search', { items }, at(QUOTE)), [])
  assert.deepEqual(portalDocuments('company-registration', null, at(QUOTE)), [])
})

test('the quote once sent; invoices only once paid or due', () => {
  assert.deepEqual(portalDocuments('company-registration', { items }, at(QUOTE)), [
    { kind: 'quote' },
  ])
  assert.deepEqual(
    portalDocuments(
      'company-registration',
      { items, paidDeposit: '2026-10-20T00:00:00Z' },
      at(QUOTE),
    ),
    [{ kind: 'quote' }, { kind: 'invoice', stage: 'deposit', paidOn: '2026-10-20' }],
  )
  assert.deepEqual(
    portalDocuments(
      'company-registration',
      { items, paidDeposit: '2026-10-20T00:00:00Z' },
      at(READY),
    ),
    [
      { kind: 'quote' },
      { kind: 'invoice', stage: 'deposit', paidOn: '2026-10-20' },
      { kind: 'invoice', stage: 'balance', paidOn: null },
    ],
  )
})

test('paid in full shows only the full invoice', () => {
  assert.deepEqual(
    portalDocuments(
      'visa',
      { items, paidFull: '2026-10-21T00:00:00Z', paidDeposit: '2026-10-20' },
      at(NEW),
    ),
    [{ kind: 'quote' }, { kind: 'invoice', stage: 'full', paidOn: '2026-10-21' }],
  )
})
