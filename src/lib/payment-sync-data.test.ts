import assert from 'node:assert/strict'
import { test } from 'node:test'
import { confirmedPaymentNote, paymentSyncVersion } from './payment-sync-data.ts'
const app = {
  reference: 'HGA-TEST',
  name: 'Client <x>',
  country: 'Kuwait',
  whatsapp: '+123',
  email: 'client@example.test',
  billing: {
    items: [{ service: 'other', name: 'Services', unitPrice: 10000 }],
    payments: [
      {
        id: 'p1',
        amount: 3000,
        paidOn: '2026-11-01',
        method: 'cash' as const,
        receivedBy: 'Staff',
      },
    ],
    depositPlan: '30',
  },
}
test('confirmed payment summary includes identity, cash and accurate balance', () => {
  const note = confirmedPaymentNote(app, 'admin@example.test')
  assert.match(note, /Client &lt;x&gt;/)
  assert.match(note, /Cash \/ 现金/)
  assert.match(note, /CNY 3,000.00/)
  assert.match(note, /CNY 7,000.00/)
  assert.match(note, /Partially paid/)
  assert.match(note, /admin@example.test/)
})
test('missing or invalid receipts cannot be confirmed', () => {
  assert.throws(() =>
    confirmedPaymentNote({ ...app, billing: { ...app.billing, payments: [] } }, 'Staff'),
  )
  assert.throws(() =>
    confirmedPaymentNote(
      {
        ...app,
        billing: { ...app.billing, payments: [{ ...app.billing.payments[0]!, amount: -1 }] },
      },
      'Staff',
    ),
  )
})
test('snapshot detects unsaved financial changes but ignores empty versus null references', () => {
  const saved = paymentSyncVersion(app.billing)
  assert.notEqual(
    saved,
    paymentSyncVersion({
      ...app.billing,
      items: [{ service: 'other', name: 'Services', unitPrice: 20000 }],
    }),
  )
  assert.notEqual(
    saved,
    paymentSyncVersion({
      ...app.billing,
      payments: [{ ...app.billing.payments[0]!, amount: 4000 }],
    }),
  )
  assert.equal(
    saved,
    paymentSyncVersion({
      ...app.billing,
      payments: [{ ...app.billing.payments[0]!, reference: null }],
    }),
  )
})
