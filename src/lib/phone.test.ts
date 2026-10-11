import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DIAL_COUNTRIES } from './dial-codes.ts'
import { whatsappNumber } from './phone.ts'

test('the chosen code is joined to a local number, without its leading 0', () => {
  assert.equal(whatsappNumber('SA', '0501234567'), '+966501234567')
  assert.equal(whatsappNumber('SA', '50 123 4567'), '+966501234567')
  assert.equal(whatsappNumber('YE', '771234567'), '+967771234567')
  assert.equal(whatsappNumber('EG', '01012345678'), '+201012345678')
})

test('a number typed in full is kept, whatever the box says', () => {
  assert.equal(whatsappNumber('SA', '+967 77 123 4567'), '+967771234567')
  assert.equal(whatsappNumber('SA', '00971501234567'), '+971501234567')
  // Typed with the code but no plus: the code is not added twice.
  assert.equal(whatsappNumber('SA', '966501234567'), '+966501234567')
})

test('Arabic-Indic digits are read as digits', () => {
  assert.equal(whatsappNumber('SA', '٠٥٠١٢٣٤٥٦٧'), '+966501234567')
})

test('nonsense and too-short numbers are refused', () => {
  assert.equal(whatsappNumber('SA', '12'), null)
  assert.equal(whatsappNumber('SA', 'abc'), null)
  assert.equal(whatsappNumber('SA', '+12'), null)
  assert.equal(whatsappNumber('SA', ''), null)
})

test('a page from before the code box still works with a full number', () => {
  assert.equal(whatsappNumber(null, '+966501234567'), '+966501234567')
  assert.equal(whatsappNumber(null, '966501234567'), '+966501234567')
})

test('every country has a distinct ISO code and a digits-only calling code', () => {
  const codes = new Set(DIAL_COUNTRIES.map((c) => c.code))
  assert.equal(codes.size, DIAL_COUNTRIES.length)
  for (const c of DIAL_COUNTRIES) assert.match(c.dial, /^[1-9]\d{0,3}$/, c.code)
})
