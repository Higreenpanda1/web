import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  dealCategory,
  dealName,
  dealProperties,
  followUpTask,
  needsPaymentCheck,
  noteBody,
  replyTask,
  requestSource,
  splitName,
} from './hubspot-format.ts'

const app = {
  reference: 'HGA-20261004-ABC123',
  type: 'company-registration',
  typeLabel: 'Company registration',
  name: 'Naif Albusais',
  country: 'Saudi Arabia',
  whatsapp: '+966590906050',
  email: 'n@example.com',
  headline: 'guangzhou · sole',
  details: {},
  sourcePath: '/apply/company-registration',
  referrer: null,
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
  assert.equal(dealName(app), 'Company Formation / 公司注册 – Naif Albusais – HGA-20261004-ABC123')
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

test('every form maps to one of our companies and a HubSpot service', () => {
  const of = (type: string, details: Record<string, unknown> = {}) =>
    dealCategory({ type, details })
  assert.deepEqual(of('company-registration'), { company: 'higp', service: 'company_registration' })
  assert.deepEqual(of('account-opening', { accountType: 'hk-bank' }), {
    company: 'higp',
    service: 'bank_account',
  })
  assert.equal(of('account-opening', { accountType: 'wechat-pay' }).service, 'alipay_wechat')
  assert.equal(of('visa', { visaType: 'work' }).service, 'work_permit')
  assert.equal(of('visa', { visaType: 'family' }).service, 'family_visa')
  assert.equal(of('visa', { visaType: 'business' }).service, 'business_visa')
  assert.equal(of('visa-invitation').service, 'invitation_letter')
  assert.equal(of('store-setup').service, 'store_setup')
  assert.equal(of('trademark').service, 'trademark')
  assert.deepEqual(of('product-search'), { company: 'nasher', service: 'product_sourcing' })
  assert.deepEqual(of('shipping-quote'), { company: 'nasher', service: 'shipping' })
  assert.deepEqual(of('consultation'), { company: 'higp', service: 'consultation' })
})

test('other deals are named after the service, in English and Chinese', () => {
  const bank = {
    ...app,
    type: 'account-opening',
    name: 'Ahmed Ali',
    details: { accountType: 'china-bank' },
  }
  assert.equal(dealName(bank), 'Bank Account / 银行开户 – Ahmed Ali – HGA-20261004-ABC123')
  assert.deepEqual(dealProperties(bank), {
    dealname: 'Bank Account / 银行开户 – Ahmed Ali – HGA-20261004-ABC123',
    our_company: 'higp',
    hgp_service: 'bank_account',
    hgp_request_source: '/apply/company-registration',
  })
})

test('the reply task is due the next day and names the service', () => {
  const now = new Date('2026-10-04T00:00:00Z')
  const task = replyTask({ ...app, type: 'product-search' }, now)
  assert.equal(task.dueISO, '2026-10-05T00:00:00.000Z')
  assert.equal(
    task.subject,
    'Reply to client: Naif Albusais – Product Sourcing / 回复客户：Naif Albusais – 产品采购',
  )
  assert.match(task.body, /WhatsApp \+966590906050/)
})

test('only HiGP priced services get the payment check', () => {
  assert.equal(needsPaymentCheck({ type: 'company-registration', details: {} }), true)
  assert.equal(needsPaymentCheck({ type: 'trademark', details: {} }), true)
  assert.equal(needsPaymentCheck({ type: 'consultation', details: {} }), false)
  assert.equal(needsPaymentCheck({ type: 'product-search', details: {} }), false)
  assert.equal(needsPaymentCheck({ type: 'shipping-quote', details: {} }), false)
  assert.doesNotMatch(noteBody({ ...app, type: 'product-search' }), /尚未付款/)
})

test('request source is the page, plus the outside site the visitor came from', () => {
  assert.equal(requestSource('/apply/visa', null), '/apply/visa')
  assert.equal(
    requestSource('/en/apply/visa', 'https://www.google.com/search?q=x'),
    '/en/apply/visa (from google.com)',
  )
  assert.equal(
    requestSource('/apply/visa', 'https://higreenpanda.com/services/visa'),
    '/apply/visa',
  )
  assert.equal(requestSource(null, 'not a url'), 'website')
})
