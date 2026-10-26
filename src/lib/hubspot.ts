import { hubspot as hubspotConfig } from './env'
import {
  dealProperties,
  followUpTask,
  needsPaymentCheck,
  noteBody,
  replyTask,
  splitName,
  type HubSpotApplication,
} from './hubspot-format'

export type { HubSpotApplication } from './hubspot-format'

/**
 * HubSpot CRM sync for the application forms.
 *
 * Same contract as the notification email: the application is already in
 * Postgres when this runs, and nothing here may throw or slow the visitor
 * down for long. If HubSpot is down or the token is wrong, the request is
 * still in the CMS and in the inbox; this only logs.
 *
 * What it creates, in English and Chinese because the team works in both:
 *   - the contact, matched by email, else by WhatsApp number, so a client
 *     who writes twice (or first talked to the WhatsApp bot, which matches
 *     the same way) stays one contact;
 *   - for every form, a deal in the services pipeline at "New Inquiry", with
 *     "Our company" (HiGP or Nasher), "Service" and "Request source" set;
 *   - a note with all the answers and the uploaded files;
 *   - a task to reply to the client within a day;
 *   - for HiGP's priced services, a task seven days out to check whether the
 *     client has paid. The owner's rule is that work starts only after
 *     payment, and an unpaid request is closed as "Not Completed" after a week.
 *
 * Switched on by HUBSPOT_TOKEN (a HubSpot private app token with read and
 * write access to contacts and deals). Without it, it does nothing.
 */

// HubSpot's fixed association type ids.
const ASSOC = {
  dealToContact: 3,
  noteToContact: 202,
  noteToDeal: 214,
  taskToContact: 204,
  taskToDeal: 216,
} as const

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`https://api.hubapi.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${hubspotConfig.token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`HubSpot ${method} ${path} → ${response.status} ${text.slice(0, 300)}`)
  }
  return (await response.json()) as T
}

type Created = { id: string }

type Found = { id: string; properties: Record<string, string | null> }

/**
 * The client's contact: the one with their email, else the one with their
 * WhatsApp number in `phone` or `mobilephone`, else a new one. The number
 * is already "+<digits>" (src/lib/phone.ts), the same form the WhatsApp bot
 * writes, so the two never make two contacts for one person.
 */
async function upsertContact(app: HubSpotApplication): Promise<string> {
  const properties: Record<string, string> = {
    ...splitName(app.name),
    phone: app.whatsapp,
    country: app.country,
  }
  const email = app.email?.toLowerCase() ?? null
  const filterGroups = [
    ...(email ? [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }] : []),
    { filters: [{ propertyName: 'phone', operator: 'EQ', value: app.whatsapp }] },
    { filters: [{ propertyName: 'mobilephone', operator: 'EQ', value: app.whatsapp }] },
  ]
  const { results } = await call<{ results: Found[] }>('POST', '/crm/v3/objects/contacts/search', {
    filterGroups,
    properties: ['email'],
    limit: 10,
  })
  const byEmail = email ? results.find((c) => c.properties.email?.toLowerCase() === email) : null
  const found = byEmail ?? results[0]

  if (found) {
    // A contact found by number gets the email only when it has none, so
    // one person's second address never overwrites the first.
    const update = { ...properties, ...(email && !found.properties.email ? { email } : {}) }
    await call('PATCH', `/crm/v3/objects/contacts/${found.id}`, { properties: update })
    return found.id
  }
  const created = await call<Created>('POST', '/crm/v3/objects/contacts', {
    properties: { ...properties, ...(email ? { email } : {}) },
  })
  return created.id
}

/** A deal already made for this request, found by the reference in its name. */
async function existingDeal(reference: string): Promise<string | null> {
  const { results } = await call<{ results: Found[] }>('POST', '/crm/v3/objects/deals/search', {
    query: reference,
    properties: ['dealname'],
    limit: 10,
  })
  return results.find((deal) => deal.properties.dealname?.includes(reference))?.id ?? null
}

function assoc(id: string, typeId: number) {
  return {
    to: { id },
    types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: typeId }],
  }
}

function owner(): Record<string, string> {
  return hubspotConfig.ownerId ? { hubspot_owner_id: hubspotConfig.ownerId } : {}
}

export type HubSpotDocument = { filename: string; mime: string; content: Uint8Array }

/**
 * Uploads a document to HubSpot's file manager as a private file (only
 * signed-in users can open it) and returns its id for the note. Needs the
 * `files` scope on the token; without it this returns null and the note is
 * created without attachments — the email still carries them.
 */
async function uploadDocument(reference: string, doc: HubSpotDocument): Promise<string | null> {
  try {
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(doc.content)], { type: doc.mime }), doc.filename)
    form.append('folderPath', `/website-applications/${reference}`)
    form.append('options', JSON.stringify({ access: 'PRIVATE', overwrite: false }))
    const response = await fetch('https://api.hubapi.com/files/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hubspotConfig.token}` },
      body: form,
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`HubSpot file upload → ${response.status} ${text.slice(0, 300)}`)
    }
    const { id } = (await response.json()) as Created
    return id
  } catch (error) {
    console.error(`[application ${reference}] HubSpot file upload failed`, error)
    return null
  }
}

async function createTask(
  task: { subject: string; body: string; dueISO: string },
  contactId: string,
  dealId: string,
) {
  await call<Created>('POST', '/crm/v3/objects/tasks', {
    properties: {
      hs_task_subject: task.subject,
      hs_task_body: task.body,
      hs_timestamp: task.dueISO,
      hs_task_status: 'NOT_STARTED',
      hs_task_priority: 'MEDIUM',
      ...owner(),
    },
    associations: [assoc(contactId, ASSOC.taskToContact), assoc(dealId, ASSOC.taskToDeal)],
  })
}

/**
 * Never throws. Returns the deal's id when everything was created, null
 * otherwise. `resend` is the admin's "Resend to HubSpot": a deal a failed
 * first attempt already made is reused rather than doubled.
 */
export async function syncApplicationToHubSpot(
  app: HubSpotApplication,
  documents: HubSpotDocument[] = [],
  { resend = false }: { resend?: boolean } = {},
): Promise<{ dealId: string } | null> {
  if (!hubspotConfig.configured) return null

  try {
    const contactId = await upsertContact(app)

    const reused = resend ? await existingDeal(app.reference) : null
    const dealId =
      reused ??
      (
        await call<Created>('POST', '/crm/v3/objects/deals', {
          properties: {
            ...dealProperties(app),
            pipeline: hubspotConfig.pipelineId,
            dealstage: hubspotConfig.newStageId,
            ...owner(),
          },
          associations: [assoc(contactId, ASSOC.dealToContact)],
        })
      ).id

    const attachmentIds = (
      await Promise.all(documents.map((doc) => uploadDocument(app.reference, doc)))
    ).filter((id): id is string => Boolean(id))

    await call<Created>('POST', '/crm/v3/objects/notes', {
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: noteBody(app),
        ...(attachmentIds.length ? { hs_attachment_ids: attachmentIds.join(';') } : {}),
        ...owner(),
      },
      associations: [assoc(contactId, ASSOC.noteToContact), assoc(dealId, ASSOC.noteToDeal)],
    })

    await createTask(replyTask(app), contactId, dealId)
    if (needsPaymentCheck(app)) await createTask(followUpTask(app), contactId, dealId)

    return { dealId }
  } catch (error) {
    console.error(`[application ${app.reference}] HubSpot sync failed`, error)
    return null
  }
}
