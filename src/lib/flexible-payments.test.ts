import assert from 'node:assert/strict'
import { test } from 'node:test'
import { billLines, billSums } from './billing.ts'

const lines = billLines([{ service: 'other', name: 'Services', unitPrice: 25300 }])
test('30% deposit and balance use exact cents', () => {
  const sums = billSums(lines, { depositPercent: 30 })
  assert.equal(sums.deposit, 7590)
  assert.equal(sums.balance, 17710)
})
test('custom requested amount is independent of actual cash received', () => {
  const sums = billSums(lines, { depositAmount: 4000, received: 3000 })
  assert.equal(sums.deposit, 4000)
  assert.equal(sums.balance, 22300)
})
test('several receipts reduce the balance; overpayment does not create negative debt', () => {
  assert.equal(billSums(lines, { received: 8000.5 }).balance, 17299.5)
  assert.equal(billSums(lines, { received: 26000 }).balance, 0)
})
test('30% keeps pass-through rent payable in full', () => {
  const sums = billSums(
    billLines([{ service: 'HGP-ADDR-BASIC' }, { service: 'other', name: 'Fee', unitPrice: 1000 }]),
    { depositPercent: 30 },
  )
  assert.equal(sums.deposit, 3500)
  assert.equal(sums.balance, 700)
})

test('full payment discount is retained in the recorded balance', () => {
  const full = billSums(lines).full
  const sums = billSums(lines, { fullDiscount: true, received: full })
  assert.equal(sums.deposit, full)
  assert.equal(sums.balance, 0)
})
