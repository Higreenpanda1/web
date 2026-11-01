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
  companyName1: 'Example A',
  companyName2: 'Example B',
  companyName3: 'Example C',
  businessMethods: ['import-export'],
  businessSectors: ['marine'],
  registeredCapital: '30000',
  capitalCurrency: 'usd',
  addressOption: 'own-office',
  shareholderCount: '1',
  decisionMakerIndex: '0',
  passportHasSignature: 'no',
  registrationMode: 'in-person',
  'owners.index': [],

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
      accountingMonthlyTransactions: '2',
      accountingMonthlyInvoices: '3',
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

test('two owner cards preserve independent contacts and enforce a 100 percent total', () => {
  const input = {
    ...base,
    shareholderCount: '2',
    'owners.index': ['1'],

    'owners.1.ownerName': 'Second Owner',
    'owners.1.ownerCountry': 'Yemen',
    'owners.1.ownerPhone': '13023440305',
    'owners.1.ownerPhoneCode': 'CN',
    'owners.1.ownerEmail': 'second@example.test',
    'owners.1.ownerShare': '25',
    'owners.1.ownerInChina': 'no',
    'owners.1.ownerHasChinesePhone': 'no',
    decisionMakerIndex: '1',
  }
  const result = validateApplication(form, reader(input))
  assert.ok(result.ok)
  const owners = result.details.owners as Record<string, unknown>[]
  assert.equal(owners[1]!.ownerPhone, '+8613023440305')
  assert.equal(owners[0]!.ownerShare, '75')
  assert.equal(owners[0]!.ownerName, base.name)
  assert.equal(result.details.decisionMaker, 'Second Owner')
  assert.equal(result.details.ownership, 'partners')
  const invalid = validateApplication(form, reader({ ...input, 'owners.1.ownerShare': '100' }))
  assert.ok(!invalid.ok)
  assert.equal(invalid.errors.owners, 'shareTotal')
  const count = validateApplication(form, reader({ ...input, shareholderCount: '3' }))
  assert.ok(!count.ok)
  assert.equal(count.errors.owners, 'ownerCount')
  const decision = validateApplication(form, reader({ ...input, decisionMakerIndex: '2' }))
  assert.ok(!decision.ok)
  assert.equal(decision.errors.decisionMakerIndex, 'invalid')
})
test('owner entry stamp, Chinese phone and representative signature follow their own conditions', () => {
  const fields = singleFields(form)
  const signature = fields.find((f) => f.name === 'legalRepSignature')!
  assert.equal(isVisible(signature, reader({ ...base, passportHasSignature: 'yes' }), fields), true)
  assert.equal(isVisible(signature, reader({ ...base, passportHasSignature: 'no' }), fields), false)
  const owners = form.steps.find((s) => s.repeat?.name === 'owners')!.fields
  assert.equal(
    isVisible(
      owners.find((f) => f.name === 'ownerEntryStamp')!,
      reader({ ownerInChina: 'yes' }),
      owners,
    ),
    true,
  )
  assert.equal(
    isVisible(
      owners.find((f) => f.name === 'ownerEntryStamp')!,
      reader({ ownerInChina: 'no' }),
      owners,
    ),
    false,
  )
  const invalid = validateApplication(
    form,
    reader({ ...base, chinesePhone: 'yes', chinesePhoneNumber: '' }),
  )
  assert.ok(!invalid.ok)
  assert.equal(invalid.errors['chinesePhoneNumber'], 'required')
})
test('low-volume accounting offers each count from one to ten and disjoint higher ranges', () => {
  for (const name of ['accountingMonthlyTransactions', 'accountingMonthlyInvoices']) {
    const field = singleFields(form).find((f) => f.name === name)!
    for (let n = 1; n <= 10; n++) assert.ok(field.options?.includes(String(n)))
    assert.ok(field.options?.includes('11-15'))
    assert.ok(field.options?.includes('16-25'))
    assert.equal(field.options?.includes('1-20'), false)
  }
})

test('applicant is automatically the first owner with the remaining share', () => {
  const sole = validateApplication(
    form,
    reader({ ...base, 'owners.0.ownerShare': '5', 'owners.0.ownerName': 'Forged name' }),
  )
  assert.ok(sole.ok)
  const first = (sole.details.owners as Record<string, unknown>[])[0]!
  assert.equal(first.ownerName, base.name)
  assert.equal(first.ownerShare, '100')
  const pair = validateApplication(
    form,
    reader({
      ...base,
      shareholderCount: '2',
      'owners.index': ['1'],
      'owners.1.ownerName': 'Partner',
      'owners.1.ownerCountry': 'Kuwait',
      'owners.1.ownerPhone': '+96541030970',
      'owners.1.ownerEmail': 'partner@example.test',
      'owners.1.ownerShare': '1',
      'owners.1.ownerInChina': 'no',
      'owners.1.ownerHasChinesePhone': 'no',
    }),
  )
  assert.ok(pair.ok)
  assert.equal((pair.details.owners as Record<string, unknown>[])[0]!.ownerShare, '99')
})
test('other services requires a description even when it is not the first selected method', () => {
  const missing = validateApplication(
    form,
    reader({ ...base, businessMethods: ['shipping-logistics', 'other-services'] }),
  )
  assert.ok(!missing.ok)
  assert.equal(missing.errors.otherServices, 'required')
  const ok = validateApplication(
    form,
    reader({
      ...base,
      businessMethods: ['shipping-logistics', 'other-services'],
      otherServices: 'Export documentation support',
    }),
  )
  assert.ok(ok.ok)
  const hidden = validateApplication(
    form,
    reader({ ...base, otherServices: 'Should not be saved' }),
  )
  assert.ok(hidden.ok)
  assert.equal('otherServices' in hidden.details, false)
})
test('three proposed English names are mandatory and certified remote copy is optional at intake', async () => {
  const missing = validateApplication(form, reader({ ...base, companyName3: '' }))
  assert.ok(!missing.ok)
  assert.equal(missing.errors.companyName3, 'required')
  const fields = singleFields(form)
  const remote = fields.filter((f) => f.name === 'certifiedPassportCopy')
  const files = await checkDocuments(
    remote,
    () => null,
    (f) => isVisible(f, reader({ ...base, registrationMode: 'remote' }), fields),
  )
  assert.ok(files.ok)
  const entry = fields.find((f) => f.name === 'entryStamp')!
  assert.equal(entry.required, true)
  assert.equal(isVisible(entry, reader({ ...base, inChinaNow: 'yes' }), fields), true)
  assert.equal(form.steps[0]!.key, 'registrationMethod')
  assert.ok(
    form.steps.findIndex((s) => s.key === 'ownership') <
      form.steps.findIndex((s) => s.key === 'company'),
  )
})
