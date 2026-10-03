import { hubspot as hubspotConfig } from './env'
import {
  dealName,
  followUpTask,
  isCompanyRegistration,
  noteBody,
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
 *   - every form: the contact (matched by email when there is one) and a note
 *     with all the answers;
 *   - company registration: a deal in the services pipeline at "New Inquiry",
 *     and a task seven days out to check whether the client has paid. The
 *     owner's rule is that formation work starts only after payment, and an
 *     unpaid request is closed as "Not Completed" after a week.
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

async function upsertContact(app: HubSpotApplication): Promise<string> {
  const properties: Record<string, string> = {
    ...splitName(app.name),
    phone: app.whatsapp,
    country: app.country,
  }
  if (app.email) {
    const result = await call<{ results: Created[] }>(
      'POST',
      '/crm/v3/objects/contacts/batch/upsert',
      {
        inputs: [{ id: app.email.toLowerCase(), idProperty: 'email', properties }],
      },
    )
    const id = result.results[0]?.id
    if (!id) throw new Error('HubSpot upsert returned no contact')
    return id
  }
  const created = await call<Created>('POST', '/crm/v3/objects/contacts', { properties })
  return created.id
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

/** Never throws. Returns true when everything was created. */
export async function syncApplicationToHubSpot(app: HubSpotApplication): Promise<boolean> {
  if (!hubspotConfig.configured) return false

  try {
    const contactId = await upsertContact(app)

    let dealId: string | null = null
    if (isCompanyRegistration(app)) {
      const deal = await call<Created>('POST', '/crm/v3/objects/deals', {
        properties: {
          dealname: dealName(app),
          pipeline: hubspotConfig.pipelineId,
          dealstage: hubspotConfig.newStageId,
          ...owner(),
        },
        associations: [assoc(contactId, ASSOC.dealToContact)],
      })
      dealId = deal.id
    }

    await call<Created>('POST', '/crm/v3/objects/notes', {
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: noteBody(app),
        ...owner(),
      },
      associations: [
        assoc(contactId, ASSOC.noteToContact),
        ...(dealId ? [assoc(dealId, ASSOC.noteToDeal)] : []),
      ],
    })

    if (dealId) {
      const task = followUpTask(app)
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

    return true
  } catch (error) {
    console.error(`[application ${app.reference}] HubSpot sync failed`, error)
    return false
  }
}
