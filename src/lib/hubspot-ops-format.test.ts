import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  RENEWAL_STAGES,
  planRenewals,
  renewalDealName,
  renewalTask,
  reportEmail,
  reportSections,
  type ReportDeal,
} from './hubspot-ops-format.ts'

const masa = {
  id: '1',
  name: '广州玛萨商贸有限公司 / Masa',
  nextRenewalDate: '2026-11-20',
  workPermitExpiry: null,
}

test('nothing to do while the date is more than 30 days away', () => {
  assert.deepEqual(planRenewals(masa, [], '2026-10-20'), [])
})

test('an active renewal deal moves to Renewal Due', () => {
  const deal = {
    id: 'd',
    name: 'Annual Renewal 2026',
    stage: RENEWAL_STAGES.active,
    closeDate: '2026-11-20',
  }
  const [action] = planRenewals(masa, [deal], '2026-10-26')
  assert.equal(action?.type, 'move')
})

test('a renewal already past Active Service is left alone', () => {
  const deal = {
    id: 'd',
    name: 'Annual Renewal 2026',
    stage: RENEWAL_STAGES.invoiced,
    closeDate: '2026-11-20',
  }
  assert.deepEqual(planRenewals(masa, [deal], '2026-10-26'), [])
})

test("last year's renewal deal does not count for this year", () => {
  const old = {
    id: 'd',
    name: 'Annual Renewal 2025',
    stage: RENEWAL_STAGES.renewed,
    closeDate: '2025-11-20',
  }
  assert.equal(planRenewals(masa, [old], '2026-10-26')[0]?.type, 'create')
})

test('an annual deal is not mistaken for the permit renewal', () => {
  const company = { ...masa, workPermitExpiry: '2026-11-10' }
  const annual = {
    id: 'd',
    name: 'Annual Renewal 2026',
    stage: RENEWAL_STAGES.due,
    closeDate: '2026-11-20',
  }
  const actions = planRenewals(company, [annual], '2026-10-26')
  assert.deepEqual(
    actions.map((a) => [a.type, a.kind]),
    [['create', 'permit']],
  )
})

test('our own companies get a task, never a deal', () => {
  const ours = { ...masa, name: 'HiGP Co., Ltd. (OUR COMPANY / 我方公司)' }
  assert.equal(planRenewals(ours, [], '2026-10-26')[0]?.type, 'task-only')
})

test('stale dates are ignored', () => {
  assert.deepEqual(planRenewals({ ...masa, nextRenewalDate: '2026-08-01' }, [], '2026-10-26'), [])
})

test('task and deal names are bilingual and drop the OUR COMPANY tag', () => {
  const task = renewalTask('annual', masa, '2026-11-20')
  assert.equal(task.subject, 'Renewal in 30 days / 30天后续费 – 广州玛萨商贸有限公司 / Masa')
  assert.match(task.body, /2026-11-20/)
  assert.equal(
    renewalDealName('permit', { ...masa, name: 'X (OUR COMPANY / 我方公司)' }, '2027-01-02'),
    'Work & Residence Permit Renewal 2027 / 2027年工作许可及居留许可续签 – X',
  )
})

const deal = (over: Partial<ReportDeal>): ReportDeal => ({
  id: '1',
  name: 'Deal',
  stage: '4392706762',
  amount: 1000,
  ourCompany: 'higp',
  service: 'company_registration',
  paymentStatus: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-25T00:00:00Z',
  ...over,
})

const input = (deals: ReportDeal[]) => ({
  today: '2026-10-26',
  deals,
  overdueTasks: [],
  companies: [masa],
  dealUrl: (id: string) => `https://hs/deal/${id}`,
  taskUrl: () => 'https://hs/tasks',
})

test('report sections', () => {
  const s = reportSections(
    input([
      deal({ id: 'new', createdAt: '2026-10-23T04:54:31Z' }),
      deal({ id: 'late', updatedAt: '2026-10-01T00:00:00Z' }),
      deal({ id: 'parked', stage: RENEWAL_STAGES.active, updatedAt: '2026-01-01T00:00:00Z' }),
      deal({ id: 'owes', paymentStatus: 'partially_paid' }),
      deal({ id: 'lost', paymentStatus: 'unpaid', stage: '4392706771' }),
    ]),
  )
  assert.deepEqual(
    s.newDeals.map((d) => d.id),
    ['new'],
  )
  assert.deepEqual(
    s.lateDeals.map((d) => d.deal.id),
    ['late'],
  )
  assert.deepEqual(
    s.unpaid.map((d) => d.id),
    ['owes'],
  )
  assert.equal(s.renewals.length, 1)
})

test('report email is Arabic, right-to-left, and says when a section is empty', () => {
  const email = reportEmail(input([]))
  assert.match(email.subject, /^تقرير الأسبوع من HubSpot: 0 طلبات جديدة/)
  assert.match(email.html, /dir="rtl"/)
  assert.match(email.text, /ما فيه شي هذا الأسبوع/)
  assert.match(email.text, /العنوان والمحاسبة، 2026-11-20/)
})
