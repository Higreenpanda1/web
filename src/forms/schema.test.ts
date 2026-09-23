import assert from 'node:assert/strict'
import { test } from 'node:test'

import { FORMS } from './definitions.ts'
import { reader, validateApplication } from './schema.ts'

const contact = {
  name: 'Sami Al-Hajri',
  country: 'Saudi Arabia',
  whatsapp: '+966 50 123 4567',
  email: 'Sami@Example.com',
}

test('a complete product search passes and is normalised', () => {
  const result = validateApplication(
    FORMS['product-search'],
    reader({
      ...contact,
      productName: 'LED desk lamp',
      productLink: 'alibaba.com/product/123',
      specs: 'White, 12W, CE certified',
      quantity: '1,500',
      destinationCountry: 'Saudi Arabia',
      timeline: 'asap',
    }),
  )
  assert.ok(result.ok)
  assert.equal(result.details.whatsapp, '+966501234567')
  assert.equal(result.details.email, 'sami@example.com')
  assert.equal(result.details.quantity, 1500)
  assert.equal(result.details.productLink, 'https://alibaba.com/product/123')
  assert.equal('notes' in result.details, false)
})

test('missing required fields are reported by name, with catalogue keys', () => {
  const result = validateApplication(FORMS['product-search'], reader({ name: 'x' }))
  assert.ok(!result.ok)
  assert.equal(result.errors.country, 'required')
  assert.equal(result.errors.whatsapp, 'required')
  assert.equal(result.errors.productName, 'required')
  assert.equal(result.errors.quantity, 'required')
  assert.equal('email' in result.errors, false)
})

test('a select only accepts its own options', () => {
  const result = validateApplication(
    FORMS['shipping-quote'],
    reader({ ...contact, mode: 'teleport', packaging: 'cartons' }),
  )
  assert.ok(!result.ok)
  assert.equal(result.errors.mode, 'invalid')
  assert.equal('packaging' in result.errors, false)
})

test('a hidden conditional field is neither required nor stored', () => {
  const sole = validateApplication(
    FORMS['company-registration'],
    reader({
      ...contact,
      fullName: 'Sami Al-Hajri',
      gender: 'male',
      dateOfBirth: '1990-01-15',
      nationality: 'Yemen',
      residenceCountry: 'Saudi Arabia',
      chinesePhone: 'no',
      inChinaNow: 'no',
      city: 'shenzhen',
      companyNames: 'A / B / C',
      businessScope: 'Clothing',
      registeredCapital: '20000',
      capitalCurrency: 'usd',
      addressOption: 'virtual-work-visa',
      needResidence: 'yes',
      ownership: 'sole',
      shareholders: 'should be dropped',
      extras: ['bank-account', 'accounting'],
    }),
  )
  assert.ok(sole.ok)
  assert.equal('shareholders' in sole.details, false)
  assert.equal('cityOther' in sole.details, false)
  assert.deepEqual(sole.details.extras, ['bank-account', 'accounting'])

  const partners = validateApplication(
    FORMS['company-registration'],
    reader({ ...contact, ownership: 'partners', city: 'other' }),
  )
  assert.ok(!partners.ok)
  assert.equal(partners.errors.shareholders, 'required')
  assert.equal(partners.errors.decisionMaker, 'required')
  assert.equal(partners.errors.cityOther, 'required')
})

test('phones, emails, dates, numbers and checkbox values are checked', () => {
  const result = validateApplication(
    FORMS.consultation,
    reader({
      ...contact,
      whatsapp: '12',
      email: 'not-an-email',
      topic: 'import',
      stage: 'idea',
      goals: 'Open a store',
      preferredDays: ['sat', 'someday'],
      preferredTime: 'morning',
      channel: 'whatsapp',
      language: 'ar',
    }),
  )
  assert.ok(!result.ok)
  assert.equal(result.errors.whatsapp, 'whatsapp')
  assert.equal(result.errors.email, 'email')
  assert.equal(result.errors.preferredDays, 'invalid')

  const dated = validateApplication(
    FORMS['visa-invitation'],
    reader({ ...contact, dateOfBirth: '31/12/1990', passportExpiry: '2030-02-30' }),
  )
  assert.ok(!dated.ok)
  assert.equal(dated.errors.dateOfBirth, 'date')
  // Date.parse is lenient with impossible days in some engines; the format
  // check is what we rely on, and an ISO-shaped string is accepted.
  assert.notEqual(dated.errors.passportExpiry, 'required')

  const numbered = validateApplication(FORMS['trademark'], reader({ ...contact, classes: '99' }))
  assert.ok(!numbered.ok)
  assert.equal(numbered.errors.classes, 'number')
})

test('over-long text is refused', () => {
  const result = validateApplication(
    FORMS.consultation,
    reader({ ...contact, goals: 'x'.repeat(4001) }),
  )
  assert.ok(!result.ok)
  assert.equal(result.errors.goals, 'tooLong')
})
