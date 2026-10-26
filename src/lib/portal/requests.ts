import { hubspot as hubspotConfig } from '@/lib/env'
import { call } from '@/lib/hubspot'
import { getPayloadClient } from '@/lib/payload'
import {
  progressFor,
  progressFromSiteStatus,
  referenceIn,
  renewalKind,
  trackForType,
  type Progress,
} from './stages'

import type { Application, Customer } from '@/payload-types'

/**
 * A client's requests, as the portal shows them: the requests they sent from
 * the site, and the deals the team keeps for them in HubSpot (including ones
 * entered by hand for clients who came on WhatsApp, and renewals).
 *
 * Who sees what is decided only here, from the signed-in account:
 *   - a request belongs to an account when its email or WhatsApp number is
 *     the account's;
 *   - a deal belongs to it when it is on a HubSpot contact with that email or
 *     number, or is the deal of one of its requests;
 *   - an owner also sees what belongs to the members attached to them.
 *
 * The stage comes from the deal, so it follows the team's board without
 * anyone touching the site. When HubSpot is not connected or does not answer,
 * the site's own status stands in.
 */

export type PortalRequest = {
  /** In the URL: the request's reference, or "d<deal id>" for a deal made in HubSpot. */
  id: string
  reference: string | null
  title:
    | { kind: 'application'; type: Application['type'] }
    | { kind: 'service'; service: string }
    | { kind: 'renewal'; renewal: 'annual' | 'permit' }
    | { kind: 'other' }
  createdAt: string
  updatedAt: string
  progress: Progress
  /** A renewal's date. */
  dueDate: string | null
  application: Application | null
}

type Deal = {
  id: string
  properties: {
    dealname?: string | null
    dealstage?: string | null
    pipeline?: string | null
    hgp_service?: string | null
    our_company?: string | null
    closedate?: string | null
    createdate?: string | null
    hs_lastmodifieddate?: string | null
  }
}

const DEAL_PROPERTIES = [
  'dealname',
  'dealstage',
  'pipeline',
  'hgp_service',
  'our_company',
  'closedate',
  'createdate',
  'hs_lastmodifieddate',
]

const CACHE_MS = 60_000
const cache = new Map<number, { expires: number; requests: PortalRequest[] }>()

/** The account and, for an owner, its members. */
async function accountsInScope(customer: Customer): Promise<Customer[]> {
  if (customer.role !== 'owner') return [customer]
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'customers',
    where: { owner: { equals: customer.id } },
    limit: 200,
    depth: 0,
  })
  return [customer, ...docs]
}

export async function companyMembers(customer: Customer): Promise<Customer[]> {
  return customer.role === 'owner' ? (await accountsInScope(customer)).slice(1) : []
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function contactIds(emails: string[], phones: string[]): Promise<string[]> {
  const groups = [
    ...emails.map((value) => ({ filters: [{ propertyName: 'email', operator: 'EQ', value }] })),
    ...phones.flatMap((value) => [
      { filters: [{ propertyName: 'phone', operator: 'EQ', value }] },
      { filters: [{ propertyName: 'mobilephone', operator: 'EQ', value }] },
    ]),
  ]
  const ids = new Set<string>()
  // The search API takes at most five filter groups per call.
  for (const filterGroups of chunks(groups, 5)) {
    const { results } = await call<{ results: { id: string }[] }>(
      'POST',
      '/crm/v3/objects/contacts/search',
      { filterGroups, properties: ['email'], limit: 100 },
    )
    for (const { id } of results) ids.add(id)
  }
  return [...ids]
}

async function dealIdsOf(contacts: string[]): Promise<string[]> {
  if (contacts.length === 0) return []
  const { results } = await call<{ results: { to: { toObjectId: number | string }[] }[] }>(
    'POST',
    '/crm/v4/associations/contacts/deals/batch/read',
    { inputs: contacts.map((id) => ({ id })) },
  )
  return results.flatMap((row) => row.to.map((to) => String(to.toObjectId)))
}

async function readDeals(ids: string[]): Promise<Map<string, Deal>> {
  const deals = new Map<string, Deal>()
  for (const batch of chunks([...new Set(ids)], 100)) {
    const { results } = await call<{ results: Deal[] }>(
      'POST',
      '/crm/v3/objects/deals/batch/read',
      {
        inputs: batch.map((id) => ({ id })),
        properties: DEAL_PROPERTIES,
      },
    )
    for (const deal of results) deals.set(deal.id, deal)
  }
  return deals
}

async function loadRequests(customer: Customer): Promise<PortalRequest[]> {
  const accounts = await accountsInScope(customer)
  const emails = [...new Set(accounts.map((a) => a.email).filter((v): v is string => !!v))]
  const phones = [...new Set(accounts.map((a) => a.whatsapp).filter((v): v is string => !!v))]
  if (emails.length === 0 && phones.length === 0) return []

  const payload = await getPayloadClient()
  const { docs: applications } = await payload.find({
    collection: 'applications',
    where: {
      and: [
        { status: { not_equals: 'spam' } },
        {
          or: [
            ...(emails.length ? [{ email: { in: emails } }] : []),
            ...(phones.length ? [{ whatsapp: { in: phones } }] : []),
          ],
        },
      ],
    },
    sort: '-createdAt',
    limit: 200,
    depth: 0,
  })

  let deals = new Map<string, Deal>()
  if (hubspotConfig.configured) {
    try {
      const contacts = await contactIds(emails, phones)
      const fromContacts = await dealIdsOf(contacts)
      const fromApplications = applications
        .map((app) => app.hubspotDealId)
        .filter((id): id is string => !!id)
      deals = await readDeals([...fromContacts, ...fromApplications])
    } catch (error) {
      console.error(`[portal] HubSpot read for customer ${customer.id} failed`, error)
    }
  }
  // Only the services pipeline is the client's business.
  for (const [id, deal] of deals) {
    if (deal.properties.pipeline && deal.properties.pipeline !== hubspotConfig.pipelineId) {
      deals.delete(id)
    }
  }

  const requests: PortalRequest[] = []
  const used = new Set<string>()

  for (const app of applications) {
    const deal = app.hubspotDealId ? deals.get(app.hubspotDealId) : undefined
    if (deal) used.add(deal.id)
    const track = trackForType(app.type)
    const service = deal?.properties.hgp_service ?? null
    requests.push({
      id: app.reference,
      reference: app.reference,
      title: { kind: 'application', type: app.type },
      createdAt: app.createdAt,
      updatedAt: deal?.properties.hs_lastmodifieddate ?? app.updatedAt,
      progress: deal
        ? progressFor(deal.properties.dealstage ?? null, track, service)
        : progressFromSiteStatus(app.status, track, service),
      dueDate: null,
      application: app,
    })
  }

  for (const deal of deals.values()) {
    if (used.has(deal.id)) continue
    const p = deal.properties
    const name = p.dealname ?? ''
    const track = p.our_company === 'nasher' ? 'nasher' : 'higp'
    const progress = progressFor(p.dealstage ?? null, track, p.hgp_service ?? null)
    requests.push({
      id: `d${deal.id}`,
      reference: referenceIn(name),
      title:
        progress.track === 'renewal'
          ? { kind: 'renewal', renewal: renewalKind(name) }
          : p.hgp_service
            ? { kind: 'service', service: p.hgp_service }
            : { kind: 'other' },
      createdAt: p.createdate ?? p.hs_lastmodifieddate ?? new Date(0).toISOString(),
      updatedAt: p.hs_lastmodifieddate ?? p.createdate ?? new Date(0).toISOString(),
      progress,
      dueDate: progress.track === 'renewal' ? (p.closedate ?? null) : null,
      application: null,
    })
  }

  return requests.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

/** Everything the account may see, newest first. Cached for a minute per account. */
export async function requestsFor(customer: Customer): Promise<PortalRequest[]> {
  const hit = cache.get(customer.id)
  if (hit && hit.expires > Date.now()) return hit.requests
  const requests = await loadRequests(customer)
  cache.set(customer.id, { expires: Date.now() + CACHE_MS, requests })
  if (cache.size > 1000) cache.delete(cache.keys().next().value as number)
  return requests
}

/** One request, only if the account may see it. */
export async function requestFor(customer: Customer, id: string): Promise<PortalRequest | null> {
  return (await requestsFor(customer)).find((request) => request.id === id) ?? null
}
