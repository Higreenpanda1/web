import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FORMS, singleFields } from './definitions.ts'
import { isVisible, reader, validateApplication } from './schema.ts'
import { checkDocuments } from '../lib/documents.ts'
const form = FORMS['company-registration']
const base = {
  name: 'Client',
  email: 'client@example.test',
  country: 'Kuwait',
  whatsapp: '+96541030970',
  fullName: 'Client',
  gender: 'male',
  dateOfBirth: '1990-01-01',
  nationality: 'Palestine',
  residenceCountry: 'Kuwait',
  chinesePhone: 'no',
  inChinaNow: 'no',
  city: 'yiwu',
  companyNames: 'Example A / Example B',
  businessScope: 'Marine engine spare parts',
  registeredCapital: '30000',
  capitalCurrency: 'usd',
  addressOption: 'own-office',
  ownership: 'sole',
  accountingProvider: 'existing',
  accountantName: '张伟',
  accountantPhone: '+8613023440305',
  needResidence: 'no',
  needHkBank: 'no',
}
test('the service decisions are required within the same registration application', () => {
  const result = validateApplication(
    form,
    reader({ ...base, accountingProvider: '', needResidence: '', needHkBank: '' }),
  )
  assert.ok(!result.ok)
  assert.equal(result.errors.accountingProvider, 'required')
  assert.equal(result.errors.needResidence, 'required')
  assert.equal(result.errors.needHkBank, 'required')
})
test('external accounting requires name and phone; ours requires all three range choices', () => {
  const external = validateApplication(
    form,
    reader({ ...base, accountantName: '', accountantPhone: '' }),
  )
  assert.ok(!external.ok)
  assert.equal(external.errors.accountantName, 'required')
  assert.equal(external.errors.accountantPhone, 'required')
  const ours = validateApplication(form, reader({ ...base, accountingProvider: 'higp' }))
  assert.ok(!ours.ok)
  for (const name of [
    'accountingAnnualFlow',
    'accountingMonthlyTransactions',
    'accountingMonthlyInvoices',
  ])
    assert.equal(ours.errors[name], 'required')
  const complete = validateApplication(
    form,
    reader({
      ...base,
      accountingProvider: 'higp',
      accountingAnnualFlow: '100k-500k',
      accountingMonthlyTransactions: '21-50',
      accountingMonthlyInvoices: '11-30',
    }),
  )
  assert.ok(complete.ok)
  assert.equal('accountantName' in complete.details, false)
})
test('rejecting Hong Kong bank skips all dependent answers even if hidden controllers are forged', () => {
  const result = validateApplication(
    form,
    reader({
      ...base,
      hasChineseCompany: 'yes',
      companyName: 'Should disappear',
      companyCity: 'Hidden',
      receivingCountries: ['SA'],
    }),
  )
  assert.ok(result.ok)
  for (const name of ['hasChineseCompany', 'companyName', 'companyCity', 'receivingCountries'])
    assert.equal(name in result.details, false)
})
test('Hong Kong bank collects multiple validated countries and annual inflow, not capital', () => {
  const result = validateApplication(
    form,
    reader({
      ...base,
      needHkBank: 'yes',
      hasChineseCompany: 'no',
      legalRepInChina: 'no',
      mainProducts: 'Marine engine spare parts',
      receivingCountries: ['SA', 'KW', 'SA'],
      hkAnnualInflow: '100k-500k',
    }),
  )
  assert.ok(result.ok)
  assert.deepEqual(result.details.receivingCountries, ['SA', 'KW'])
  assert.equal(result.details.registeredCapital, 30000)
  const invalid = validateApplication(
    form,
    reader({
      ...base,
      needHkBank: 'yes',
      receivingCountries: ['invented'],
      mainProducts: 'general trading',
    }),
  )
  assert.ok(!invalid.ok)
  assert.equal(invalid.errors.receivingCountries, 'invalid')
  assert.equal(invalid.errors.mainProducts, 'specificProducts')
})
test('work residence reuses mandatory qualifications and document fields', () => {
  const result = validateApplication(form, reader({ ...base, needResidence: 'yes' }))
  assert.ok(!result.ok)
  for (const name of ['passportExpiry', 'education', 'experienceYears'])
    assert.equal(result.errors[name], 'required')
  const fields = singleFields(form)
  const read = reader({ ...base, needResidence: 'yes' })
  for (const name of [
    'personalPhoto',
    'degreeCertificate',
    'experienceCertificate',
    'policeClearance',
  ]) {
    const f = fields.find((f) => f.name === name)!
    assert.equal(f.required, true)
    assert.equal(isVisible(f, read, fields), true)
  }
})
test('Hong Kong passport-holding photo is required only when selected and rejects PDFs', async () => {
  const fields = singleFields(form)
  const onlyPhoto = fields.filter((f) => f.name === 'passportHoldingPhoto')
  const selected = reader({ ...base, needHkBank: 'yes' })
  const missing = await checkDocuments(
    onlyPhoto,
    () => null,
    (f) => isVisible(f, selected, fields),
  )
  assert.ok(!missing.ok)
  assert.equal(missing.errors.passportHoldingPhoto, 'required')
  const unselected = await checkDocuments(
    onlyPhoto,
    () => null,
    (f) => isVisible(f, reader(base), fields),
  )
  assert.ok(unselected.ok)
  const bytes = new TextEncoder().encode('%PDF-1.7')
  const pdf = { name: 'file.pdf', size: bytes.length, arrayBuffer: async () => bytes.buffer }
  const wrong = await checkDocuments(
    onlyPhoto,
    () => pdf,
    (f) => isVisible(f, selected, fields),
  )
  assert.ok(!wrong.ok)
  assert.equal(wrong.errors.passportHoldingPhoto, 'fileType')
})
test('the standalone Hong Kong application has the same extra intake questions', () => {
  const company = singleFields(form)
  const standalone = singleFields(FORMS['account-opening'])
  for (const name of ['receivingCountries', 'hkAnnualInflow', 'passportHoldingPhoto']) {
    assert.ok(company.find((f) => f.name === name)?.required)
    assert.ok(standalone.find((f) => f.name === name)?.required)
  }
})

test('external accountant name must be written in Chinese characters', () => {
  const result = validateApplication(form, reader({ ...base, accountantName: 'John Smith' }))
  assert.ok(!result.ok)
  assert.equal(result.errors.accountantName, 'chineseName')
})
