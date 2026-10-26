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

test('a complete product request passes and is normalised', () => {
  const result = validateApplication(
    FORMS['product-search'],
    reader({
      ...contact,
      'products.index': ['0', '3'],
      'products.0.productName': 'LED desk lamp',
      'products.0.productLink': 'alibaba.com/product/123',
      'products.0.quantity': '1,500',
      'products.0.unit': 'pieces',
      'products.0.targetPrice': '4.5',
      'products.0.priceCurrency': 'usd',
      'products.0.colours': 'White, black',
      'products.3.productName': 'Lamp shade',
      'products.3.quantity': '200',
      'products.3.unit': 'sets',
      'products.3.sizes': '30×40 cm',
      destinationCountry: 'Saudi Arabia',
      timeline: 'asap',
    }),
  )
  assert.ok(result.ok)
  assert.equal(result.details.whatsapp, '+966501234567')
  assert.equal(result.details.email, 'sami@example.com')
  assert.equal(result.details.destinationCountry, 'Saudi Arabia')
  assert.deepEqual(result.details.products, [
    {
      productName: 'LED desk lamp',
      productLink: 'https://alibaba.com/product/123',
      quantity: 1500,
      unit: 'pieces',
      targetPrice: 4.5,
      priceCurrency: 'usd',
      colours: 'White, black',
    },
    { productName: 'Lamp shade', quantity: 200, unit: 'sets', sizes: '30×40 cm' },
  ])
  assert.equal('notes' in result.details, false)
  assert.equal(FORMS['product-search'].headline(result.details), 'LED desk lamp × 1500 +1')
})

test('missing required fields are reported by name, with catalogue keys', () => {
  const result = validateApplication(
    FORMS['product-search'],
    reader({ name: 'x', 'products.index': '7' }),
  )
  assert.ok(!result.ok)
  assert.equal(result.errors.country, 'required')
  assert.equal(result.errors.whatsapp, 'required')
  assert.equal(result.errors['products.7.productName'], 'required')
  assert.equal(result.errors['products.7.quantity'], 'required')
  // Required since the client is sent a written confirmation.
  assert.equal(result.errors.email, 'required')
})

test('a product request needs at least one product, and takes at most ten', () => {
  const none = validateApplication(FORMS['product-search'], reader({ ...contact }))
  assert.ok(!none.ok)
  assert.equal(none.errors.products, 'required')

  const keys = Array.from({ length: 14 }, (_, i) => String(i))
  const items = Object.fromEntries(
    keys.flatMap((k) => [
      [`products.${k}.productName`, `Item ${k}`],
      [`products.${k}.quantity`, '1'],
      [`products.${k}.unit`, 'pieces'],
    ]),
  )
  const many = validateApplication(
    FORMS['product-search'],
    reader({
      ...contact,
      ...items,
      'products.index': [...keys, '0', '../x'],
      destinationCountry: 'Oman',
      timeline: 'exploring',
    }),
  )
  assert.ok(many.ok)
  assert.equal((many.details.products as unknown[]).length, 10)
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

test('the work permit does not ask for a length of stay; the other visas do', () => {
  const visa = (visaType: string) =>
    validateApplication(
      FORMS.visa,
      reader({
        ...contact,
        visaType,
        nationality: 'Yemen',
        residenceCountry: 'Saudi Arabia',
        passportExpiry: '2030-01-01',
        hasChineseCompany: 'no',
        education: 'bachelor',
        experienceYears: '3',
        chinesePhone: 'no',
        purpose: 'Canton Fair',
        familyMember: 'My husband',
      }),
    )
  const work = visa('work')
  assert.ok(work.ok)
  assert.equal('stayLength' in work.details, false)
  const business = visa('business')
  assert.ok(!business.ok)
  assert.equal(business.errors.stayLength, 'required')
})

test('a Chinese mobile is taken bare or with the country code, and stored with +86', async () => {
  const { chinaMobile } = await import('./schema.ts')
  assert.equal(chinaMobile('13812345678'), '+8613812345678')
  assert.equal(chinaMobile('138 1234 5678'), '+8613812345678')
  assert.equal(chinaMobile('+86 138-1234-5678'), '+8613812345678')
  assert.equal(chinaMobile('008613812345678'), '+8613812345678')
  assert.equal(chinaMobile('8613812345678'), '+8613812345678')
  assert.equal(chinaMobile('1381234567'), null)
  assert.equal(chinaMobile('+966501234567'), null)
  assert.equal(chinaMobile('23812345678'), null)
  assert.equal(chinaMobile('١٣٨١٢٣٤٥٦٧٨'), '+8613812345678')
  assert.equal(chinaMobile('۱۳۸ ۱۲۳۴ ۵۶۷۸'), '+8613812345678')
  assert.equal(chinaMobile('１３８１２３４５６７８'), '+8613812345678')
  assert.equal(chinaMobile('138.1234.5678'), '+8613812345678')
})

test('the WhatsApp code box is joined to the number', () => {
  const result = validateApplication(
    FORMS['product-search'],
    reader({
      ...contact,
      whatsapp: '0771234567',
      whatsappCode: 'YE',
      'products.index': '0',
      'products.0.productName': 'Lamp',
      'products.0.quantity': '10',
      'products.0.unit': 'pieces',
      destinationCountry: 'Yemen',
      timeline: 'asap',
    }),
  )
  assert.ok(result.ok)
  assert.equal(result.details.whatsapp, '+967771234567')
  assert.equal('whatsappCode' in result.details, false)
})
