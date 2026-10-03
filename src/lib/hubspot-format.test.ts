import assert from 'node:assert/strict'
import { test } from 'node:test'

import { dealName, followUpTask, noteBody, splitName } from './hubspot-format.ts'

const app = {
  reference: 'HGA-20261004-ABC123',
  type: 'company-registration',
  typeLabel: 'Company registration',
  name: 'Naif Albusais',
  country: 'Saudi Arabia',
  whatsapp: '+966590906050',
  email: 'n@example.com',
  headline: 'guangzhou · sole',
  rows: [
    { label: 'City of registration', value: 'Guangzhou' },
    { label: 'Something new', value: '<b>x</b>' },
  ],
}

test('splitName keeps the rest of the name as the last name', () => {
  assert.deepEqual(splitName('Naif Mohammed Albusais'), {
    firstname: 'Naif',
    lastname: 'Mohammed Albusais',
  })
  assert.deepEqual(splitName('Hakima'), { firstname: 'Hakima', lastname: '' })
})

test('deal name is bilingual and carries the reference', () => {
  assert.equal(
    dealName(app),
    'Company Formation / 公司注册 – Naif Albusais – HGA-20261004-ABC123',
  )
})

test('note labels get Chinese when known and escape answers', () => {
  const body = noteBody(app)
  assert.match(body, /City of registration \/ 注册城市/)
  assert.match(body, /Something new:<\/b> &lt;b&gt;x&lt;\/b&gt;/)
  assert.match(body, /尚未付款/)
})

test('payment check is due a week later', () => {
  const now = new Date('2026-10-04T00:00:00Z')
  assert.equal(followUpTask(app, now).dueISO, '2026-10-11T00:00:00.000Z')
})
