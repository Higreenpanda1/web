import { describeDetails, typeLabel } from './application-rows'
import { isApplicationType } from './catalogue'
import { loadDocuments } from './documents-store'
import { hubspot as hubspotConfig } from './env'
import { syncApplicationToHubSpot } from './hubspot'

import type { Application } from '@/payload-types'
import type { Payload } from 'payload'

/**
 * "Resend to HubSpot" for one stored application: rebuilds what the submit
 * action sent (answers, files) from the row and the documents folder, sends
 * it, and records the result on the row. A deal a failed first attempt
 * already made is reused, so pressing the button twice never makes two.
 */
export async function resendApplicationToHubSpot(
  payload: Payload,
  application: Application,
): Promise<{ ok: true; dealId: string } | { ok: false; error: string }> {
  if (!hubspotConfig.configured) {
    return { ok: false, error: 'HUBSPOT_TOKEN is not set on the server.' }
  }
  if (!isApplicationType(application.type)) {
    return { ok: false, error: `Unknown form type "${application.type}".` }
  }

  const details = (application.details ?? {}) as Record<string, unknown>
  const synced = await syncApplicationToHubSpot(
    {
      reference: application.reference,
      type: application.type,
      typeLabel: await typeLabel(application.type),
      name: application.name,
      country: application.country,
      whatsapp: application.whatsapp,
      email: application.email ?? null,
      headline: application.headline ?? '',
      details,
      sourcePath: application.meta?.sourcePath ?? null,
      referrer: application.meta?.referrer ?? null,
      rows: await describeDetails(application.type, details),
    },
    await loadDocuments(application.reference, application.createdAt),
    { resend: true },
  )
  if (!synced) return { ok: false, error: 'HubSpot refused it. The server log has the reason.' }

  await payload.update({
    collection: 'applications',
    id: application.id,
    data: { hubspotSyncedAt: new Date().toISOString(), hubspotDealId: synced.dealId },
  })
  return { ok: true, dealId: synced.dealId }
}
