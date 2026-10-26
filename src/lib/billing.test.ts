import assert from 'node:assert/strict'
import { test } from 'node:test'

import { addDays, billLines, billSums, documentNumber } from './billing.ts'

// The test deal in HubSpot: remote registration, basic address, accounting, mainland bank.
const sample = billLines([
  { service: 'HGP-REG-REMOTE' },
  { service: 'HGP-ADDR-BASIC' },
  { service: 'HGP-ACCT' },
  { service: 'HGP-BANK-CN' },
])

test('list services take their names, flags and prices from the price list', () => {
  assert.equal(sample.length, 4)
  assert.deepEqual(
    sample.map((line) => [line.zh, line.amount, line.yearly, line.passThrough]),
    [
      ['公司注册 – 远程办理', 8200, false, false],
      ['注册地址 – 不可办理工作许可', 3200, true, true],
      ['会计及纳税申报', 3800, true, false],
      ['银行开户 – 内地', 1400, false, false],
    ],
  )
})

test('the address is paid in full first and never discounted', () => {
  const sums = billSums(sample)
  assert.equal(sums.total, 16600)
  assert.equal(sums.passThrough, 3200)
  assert.equal(sums.fees, 13400)
  // 3,200 address + half of 13,400
  assert.equal(sums.deposit, 9900)
  assert.equal(sums.balance, 6700)
  assert.equal(sums.deposit + sums.balance, sums.total)
  // 3.5% of 13,400 = 469, off the fees only
  assert.equal(sums.discount, 469)
  assert.equal(sums.full, 16131)
})

test('a special price and a hand-typed line', () => {
  const lines = billLines([
    { service: 'HGP-WP', unitPrice: 7000 },
    { service: 'other', name: 'Translation', nameZh: '翻译', quantity: 3, unitPrice: 150.5 },
    { service: 'other' },
  ])
  assert.deepEqual(
    lines.map((line) => [line.en, line.zh, line.amount]),
    [
      ['Work Permit & Residence Permit', '工作许可和居留许可', 7000],
      ['Translation', '翻译', 451.5],
    ],
  )
  const sums = billSums(lines)
  assert.equal(sums.deposit + sums.balance, sums.total)
})

test('document numbers and dates', () => {
  assert.equal(documentNumber('HGA-20261026-ABC123', 'quote'), 'Q-HGA-20261026-ABC123')
  assert.equal(documentNumber('HGA-20261026-ABC123', 'balance'), 'INV-HGA-20261026-ABC123-B')
  assert.equal(addDays('2026-10-26', 7), '2026-11-02')
  assert.equal(addDays('2026-12-25', 14), '2027-01-08')
})
