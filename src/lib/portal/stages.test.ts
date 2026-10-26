import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  STAGES,
  progressFor,
  progressFromSiteStatus,
  referenceIn,
  renewalKind,
  trackForType,
} from './stages.ts'

test('every stage of the services pipeline is mapped', () => {
  assert.equal(Object.keys(STAGES).length, 27)
})

test('a new product request is on the Nasher track', () => {
  const p = progressFor('4392706760', trackForType('product-search'), 'product_sourcing')
  assert.equal(p.track, 'nasher')
  assert.equal(p.steps[p.current], 'received')
  assert.equal(p.closed, false)
})

test('a company registration in tax registration shows "company registered"', () => {
  const p = progressFor('4392706768', 'higp', 'company_registration')
  assert.equal(p.steps[p.current], 'established')
})

test('a visa never shows "company registered"', () => {
  const p = progressFor('4392706767', 'higp', 'business_visa')
  assert.ok(!p.steps.includes('established'))
  assert.equal(p.steps[p.current], 'submitted')
})

test('a deal moved into Nasher stages switches track whatever the fallback', () => {
  const p = progressFor('4394109648', 'higp', null)
  assert.equal(p.track, 'nasher')
  assert.equal(p.steps[p.current], 'shipped')
})

test('completed and stopped requests are closed', () => {
  assert.equal(progressFor('4392706770', 'higp', 'company_registration').closed, true)
  assert.equal(progressFor('4394109649', 'nasher', null).closed, true)
  const lost = progressFor('4394109650', 'nasher', null)
  assert.equal(lost.stopped, 'onHold')
  assert.equal(lost.closed, true)
  assert.equal(progressFor('4398430920', 'renewal', null).stopped, 'ended')
  assert.equal(progressFor('4398430919', 'renewal', null).closed, true)
})

test('an unknown stage starts at the beginning of the fallback track', () => {
  const p = progressFor('999', 'higp', null)
  assert.equal(p.current, 0)
  assert.equal(p.track, 'higp')
})

test('site status stands in when HubSpot cannot be read', () => {
  assert.equal(progressFromSiteStatus('completed', 'higp', null).closed, true)
  assert.equal(progressFromSiteStatus('lost', 'nasher', null).stopped, 'onHold')
  const docs = progressFromSiteStatus('documents', 'higp', null)
  assert.equal(docs.steps[docs.current], 'documents')
  const nasherDocs = progressFromSiteStatus('documents', 'nasher', null)
  assert.equal(nasherDocs.current, 0)
})

test('renewal kind and hand-made references are read from deal names', () => {
  assert.equal(renewalKind('Work & Residence Permit Renewal – ACME'), 'permit')
  assert.equal(renewalKind('Annual Renewal – ACME / 年度续费'), 'annual')
  assert.equal(referenceIn('HGP-2026-0005 Company formation'), 'HGP-2026-0005')
  assert.equal(referenceIn('No reference here'), null)
})
