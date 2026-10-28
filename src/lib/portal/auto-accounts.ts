import { email as emailConfig, hubspot as hubspotConfig } from '@/lib/env'
import { call } from '@/lib/hubspot'
import { getPayloadClient } from '@/lib/payload'
import { absoluteUrl } from '@/lib/url'
import { STAGES, isPaidStage, referenceIn } from './stages'
import { welcomeEmail, type WelcomeCompany, type WelcomeLanguage } from './welcome'

import type { Payload, Where } from 'payload'

/**
 * Opens a portal account by itself for every client who has paid, so the team
 * never creates one by hand. HubSpot is the one place payment is recorded:
 * when the team moves a deal to "Deposit Paid" (or a Nasher order to its 30%
 * deposit), the scheduler (src/lib/automation/scheduler.ts) finds it within
 * the hour, opens an account for each of the deal's contacts and emails them
 * a welcome with the portal link. A request sent from the site has its own
 * deal, so it follows the same path.
 *
 * Safe to run again and again: a client who already has an account (by email,
 * or by WhatsApp number when HubSpot has no email) is left alone and gets no
 * second email. An account the team deletes is opened again on the next run,
 * so to shut a client out, tick "Disable account" instead.
 */

type Contact = {
  id: string
  properties: {
    email?: string | null
    firstname?: string | null
    lastname?: string | null
    phone?: string | null
    mobilephone?: string | null
  }
}

export type PaidClient = {
  name: string
  email: string | null
  whatsapp: string | null
  reference: string | null
  deal: string
  /** The company serving them, which signs the welcome. */
  company: WelcomeCompany
}

type DealProps = {
  dealname?: string | null
  dealstage?: string | null
  our_company?: string | null
}

/** Nasher when the deal says so or sits in Nasher's stages; HiGP otherwise. */
function companyOf(deal: DealProps): WelcomeCompany {
  if (deal.our_company === 'nasher') return 'nasher'
  if (deal.our_company === 'higp') return 'higp'
  const stage = deal.dealstage ? STAGES[deal.dealstage] : undefined
  return stage?.track === 'nasher' ? 'nasher' : 'higp'
}

/** "+<digits>", the form Customers stores (see its beforeChange hook). */
function phone(value: string | null | undefined): string | null {
  const digits = (value ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, '')
  return digits.length >= 7 ? `+${digits}` : null
}

const PAID_STAGES = Object.keys(STAGES).filter((id) => isPaidStage(id))

/** Every contact on a paid deal, once, with the deal that has a reference first. */
export async function paidClients(): Promise<PaidClient[]> {
  const deals: Array<{ id: string; properties: DealProps }> = []
  let after: string | undefined
  for (let page = 0; page < 20; page++) {
    const result = await call<{
      results: typeof deals
      paging?: { next?: { after: string } }
    }>('POST', '/crm/v3/objects/deals/search', {
      filterGroups: [
        {
          filters: [
            { propertyName: 'pipeline', operator: 'EQ', value: hubspotConfig.pipelineId },
            { propertyName: 'dealstage', operator: 'IN', values: PAID_STAGES },
          ],
        },
      ],
      properties: ['dealname', 'dealstage', 'our_company'],
      limit: 100,
      ...(after ? { after } : {}),
    })
    deals.push(...result.results)
    after = result.paging?.next?.after
    if (!after) break
  }
  if (deals.length === 0) return []

  const contactsOf = new Map<string, string[]>()
  for (let i = 0; i < deals.length; i += 100) {
    const { results } = await call<{
      results: { from: { id: string }; to: { toObjectId: number | string }[] }[]
    }>('POST', '/crm/v4/associations/deals/contacts/batch/read', {
      inputs: deals.slice(i, i + 100).map((deal) => ({ id: deal.id })),
    })
    for (const row of results) {
      contactsOf.set(
        String(row.from.id),
        row.to.map((to) => String(to.toObjectId)),
      )
    }
  }

  const ids = [...new Set([...contactsOf.values()].flat())]
  const contacts = new Map<string, Contact>()
  for (let i = 0; i < ids.length; i += 100) {
    const { results } = await call<{ results: Contact[] }>(
      'POST',
      '/crm/v3/objects/contacts/batch/read',
      {
        inputs: ids.slice(i, i + 100).map((id) => ({ id })),
        properties: ['email', 'firstname', 'lastname', 'phone', 'mobilephone'],
      },
    )
    for (const contact of results) contacts.set(contact.id, contact)
  }

  // A deal with a reference first, so a client on two deals is welcomed with
  // the one that names their request.
  const ordered = [...deals].sort(
    (a, b) =>
      Number(Boolean(referenceIn(b.properties.dealname ?? ''))) -
      Number(Boolean(referenceIn(a.properties.dealname ?? ''))),
  )
  const seen = new Set<string>()
  const clients: PaidClient[] = []
  for (const deal of ordered) {
    const name = deal.properties.dealname ?? ''
    for (const id of contactsOf.get(deal.id) ?? []) {
      const contact = contacts.get(id)
      if (!contact || seen.has(id)) continue
      seen.add(id)
      const p = contact.properties
      const email = p.email?.trim().toLowerCase() || null
      const whatsapp = phone(p.mobilephone) ?? phone(p.phone)
      if (!email && !whatsapp) continue
      clients.push({
        name: [p.firstname, p.lastname].filter(Boolean).join(' ').trim() || email || 'Client',
        email,
        whatsapp,
        reference: referenceIn(name),
        deal: name,
        company: companyOf(deal.properties),
      })
    }
  }
  return clients
}

async function hasAccount(payload: Payload, client: PaidClient): Promise<boolean> {
  const { totalDocs } = await payload.count({
    collection: 'customers',
    where: client.email
      ? { email: { equals: client.email } }
      : { whatsapp: { equals: client.whatsapp } },
  })
  return totalDocs > 0
}

/** The language the client wrote to us in on the site, if they ever did. */
async function languageOf(payload: Payload, client: PaidClient): Promise<WelcomeLanguage> {
  const or: Where[] = [
    ...(client.email ? [{ email: { equals: client.email } }] : []),
    ...(client.whatsapp ? [{ whatsapp: { equals: client.whatsapp } }] : []),
  ]
  const { docs } = await payload.find({
    collection: 'applications',
    where: { or },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
  })
  const locale = docs[0]?.meta?.locale
  if (locale === 'ar') return 'ar'
  if (locale === 'en' || locale === 'zh') return 'en'
  return 'both'
}

export type AutoAccountResult = { opened: string[]; emailed: string[]; failed: string[] }

export async function openAccountsForPaidClients(
  options: { dryRun?: boolean } = {},
): Promise<AutoAccountResult> {
  const result: AutoAccountResult = { opened: [], emailed: [], failed: [] }
  if (!hubspotConfig.configured) return result

  const payload = await getPayloadClient()
  for (const client of await paidClients()) {
    const label = `${client.name} <${client.email ?? client.whatsapp}> (${client.reference ?? client.deal}; ${client.company})`
    try {
      if (await hasAccount(payload, client)) continue
      const language = await languageOf(payload, client)
      if (options.dryRun) {
        result.opened.push(label)
        if (client.email) result.emailed.push(`${label} [${language}]`)
        continue
      }

      await payload.create({
        collection: 'customers',
        data: {
          fullName: client.name,
          email: client.email,
          whatsapp: client.whatsapp,
          role: 'owner',
          preferredLocale: language === 'en' ? 'en' : 'ar',
          notes: `Opened automatically on ${new Date().toISOString().slice(0, 10)} after payment: ${client.deal}`,
        },
        depth: 0,
      })
      result.opened.push(label)

      if (!client.email || !emailConfig.configured) continue
      const mail = welcomeEmail({
        name: client.name,
        reference: client.reference,
        language,
        company: client.company,
        urls: { ar: absoluteUrl('ar', '/portal/login'), en: absoluteUrl('en', '/portal/login') },
      })
      await payload.sendEmail({
        from: `"${mail.fromName}" <${emailConfig.from}>`,
        to: client.email,
        replyTo: emailConfig.notifyTo[0],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      })
      result.emailed.push(label)
    } catch (error) {
      result.failed.push(`${label}: ${(error as Error).message}`)
    }
  }
  return result
}
