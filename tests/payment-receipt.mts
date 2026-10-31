import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildDocument } from '../src/lib/application-documents'
import type { Application } from '@/payload-types'
const application = {
  reference: 'HGA-TEST',
  type: 'company-registration',
  name: 'Test <client>',
  whatsapp: '+123',
  billing: {
    depositPlan: '30',
    items: [{ service: 'other', name: 'Services', unitPrice: 25300 }],
    payments: [
      {
        id: 'abcdef123456',
        amount: 7590,
        paidOn: '2026-11-01T00:00:00Z',
        method: 'cash',
        receivedBy: 'Staff <name>',
      },
      {
        id: 'abcdef654321',
        amount: 1000,
        paidOn: '2026-11-02T00:00:00Z',
        method: 'bank',
        receivedBy: 'Staff',
      },
    ],
  },
} as unknown as Application
const page = { date: '2026-11-01', nonce: null }
test('cash receipt uses saved payment, escapes names and has no bank payment demand', () => {
  const receipt = buildDocument(application, { doc: 'receipt', payment: 'abcdef123456' }, page)
  assert.ok(!('error' in receipt))
  assert.match(receipt.html, /Cash \/ 现金/)
  assert.match(receipt.html, /17,710/)
  assert.match(receipt.html, /Staff &lt;name&gt;/)
  assert.doesNotMatch(receipt.html, /Bank transfer \(SWIFT\)/)
})
test('receipt running balance includes only payments through that receipt', () => {
  const receipt = buildDocument(application, { doc: 'receipt', payment: 'abcdef654321' }, page)
  assert.ok(!('error' in receipt))
  assert.match(receipt.html, /16,710/)
  const missing = buildDocument(application, { doc: 'receipt', payment: 'unknown' }, page)
  assert.ok('error' in missing)
})
test('30 percent invoice and remaining invoice use saved plan and actual receipts', () => {
  const invoice = buildDocument(application, { doc: 'invoice', stage: 'deposit' }, page)
  assert.ok(!('error' in invoice))
  assert.match(invoice.html, /30% deposit/)
  assert.match(invoice.html, /7,590/)
  const balance = buildDocument(application, { doc: 'invoice', stage: 'balance' }, page)
  assert.ok(!('error' in balance))
  assert.match(balance.html, /16,710/)
})
test('custom invoice requires a saved valid amount', () => {
  const invalid = {
    ...application,
    billing: { ...application.billing, depositPlan: 'custom', customDeposit: 0 },
  } as Application
  assert.ok('error' in buildDocument(invalid, { doc: 'invoice', stage: 'deposit' }, page))
  invalid.billing!.customDeposit = 4000
  const valid = buildDocument(invalid, { doc: 'invoice', stage: 'deposit' }, page)
  assert.ok(!('error' in valid))
  assert.match(valid.html, /4,000/)
})
