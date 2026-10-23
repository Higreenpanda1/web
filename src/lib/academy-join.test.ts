import assert from 'node:assert/strict'
import { test } from 'node:test'

import { academyJoin, countryOfNumber } from './academy-join.ts'

const form = (fields: Record<string, string>) => ({ get: (name: string) => fields[name] ?? null })

test('a join request becomes one enquiry with the seat and plan in its message', () => {
  const join = academyJoin(
    form({ n: ' Ali ', p: '+966 50 123 4567', s: 'exp', t: 'premium' }),
    'en',
  )
  assert.deepEqual(join && { name: join.name, whatsapp: join.whatsapp, country: join.country }, {
    name: 'Ali',
    whatsapp: '+966501234567',
    country: 'السعودية',
  })
  assert.match(join!.message, /أصدّر من الصين/)
  assert.match(join!.message, /بريميوم · 2,900 يوان/)
  assert.match(join!.message, /الإنجليزية/)
})

test('unknown seat or plan values fall back to the defaults the form starts on', () => {
  const join = academyJoin(form({ n: 'Ali', p: '+971501234567', s: 'x', t: 'y' }), 'ar')
  assert.match(join!.message, /أستورد من الصين/)
  assert.match(join!.message, /ماستر · 1,500 يوان/)
})

test('a request from the Chinese page says so', () => {
  const join = academyJoin(form({ n: '王伟', p: '+8613800138000' }), 'zh')
  assert.equal(join!.country, 'الصين')
  assert.match(join!.message, /الصينية/)
})

test('a missing name or a number without its country code is refused', () => {
  assert.equal(academyJoin(form({ n: '', p: '+966501234567' }), 'ar'), null)
  assert.equal(academyJoin(form({ n: 'Ali', p: '0501234567' }), 'ar'), null)
  assert.equal(academyJoin(form({ n: 'Ali', p: '' }), 'ar'), null)
})

test('the country is read from the longest matching calling code', () => {
  assert.equal(countryOfNumber('+967771234567', 'en'), 'Yemen')
  assert.equal(countryOfNumber('+18765551234', 'en'), 'Jamaica')
  assert.equal(countryOfNumber('+8613800138000', 'ar'), 'الصين')
})
