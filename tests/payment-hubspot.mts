import assert from 'node:assert/strict'
import { test } from 'node:test'
import { upsertPaymentNote } from '../src/lib/payment-hubspot'

test('retry updates existing payment summary instead of creating another note', async () => {
  const calls: any[] = []
  const api: any = async (method: string, path: string, body: any) => {
    calls.push({ method, path, body })
    if (path.includes('/associations/')) return { results: [{ toObjectId: 44 }] }
    if (path.endsWith('/batch/read'))
      return {
        results: [
          { id: '44', properties: { hs_note_body: '<p>HGP-PAYMENTS:HGA-TEST</p><p>Old</p>' } },
        ],
      }
    if (method === 'PATCH') return { id: '44' }
    throw new Error('Unexpected API call')
  }
  assert.equal(await upsertPaymentNote('123', 'HGA-TEST', 'New summary', api), '44')
  assert.equal(calls.filter((c) => c.method === 'PATCH').length, 1)
  assert.equal(calls.filter((c) => c.method === 'POST' && !c.path.endsWith('batch/read')).length, 0)
})
test('new summary is attached to the correct existing deal only after checking all pages', async () => {
  const calls: any[] = []
  const api: any = async (method: string, path: string, body: any) => {
    calls.push({ method, path, body })
    if (path.includes('/associations/'))
      return path.includes('after=')
        ? { results: [] }
        : { results: [], paging: { next: { after: '2' } } }
    if (path === '/crm/v3/objects/notes') return { id: '99' }
    throw new Error('Unexpected API call')
  }
  assert.equal(await upsertPaymentNote('123', 'HGA-TEST', 'Summary', api), '99')
  assert.equal(calls.filter((c) => c.method === 'GET').length, 2)
  assert.equal(calls.at(-1).body.associations[0].to.id, '123')
})
test('HubSpot failure propagates so the UI cannot report a false success', async () => {
  const api: any = async () => {
    throw new Error('HubSpot unavailable')
  }
  await assert.rejects(upsertPaymentNote('123', 'HGA-TEST', 'Summary', api), /unavailable/)
})
