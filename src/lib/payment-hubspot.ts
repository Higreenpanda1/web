import { call, assoc, ASSOC, owner } from './hubspot'
import { hubspot } from './env'
import { resendApplicationToHubSpot } from './hubspot-resend'
import { confirmedPaymentNote, paymentMarker, paymentSyncVersion } from './payment-sync-data'
import type { Payload } from 'payload'

type Caller = <T>(method: string, path: string, body?: unknown) => Promise<T>

/** Reuses one payment-summary note. Scan the deal before creating, including after a timeout. */
export async function upsertPaymentNote(
  dealId: string,
  reference: string,
  body: string,
  api: Caller = call,
): Promise<string> {
  let after: string | undefined
  const seen = new Set<string>()
  do {
    const page = await api<{
      results: { toObjectId: number | string }[]
      paging?: { next?: { after: string } }
    }>(
      'GET',
      `/crm/v4/objects/deals/${encodeURIComponent(dealId)}/associations/notes?limit=500${after ? '&after=' + encodeURIComponent(after) : ''}`,
    )
    const ids = page.results.map((r) => String(r.toObjectId))
    for (let offset = 0; offset < ids.length; offset += 100) {
      const notes = await api<{ results: { id: string; properties: { hs_note_body?: string } }[] }>(
        'POST',
        '/crm/v3/objects/notes/batch/read',
        {
          properties: ['hs_note_body'],
          inputs: ids.slice(offset, offset + 100).map((id) => ({ id })),
        },
      )
      const existing = notes.results.find((n) =>
        n.properties.hs_note_body?.includes(`<p>${paymentMarker(reference)}</p>`),
      )
      if (existing) {
        await api('PATCH', `/crm/v3/objects/notes/${encodeURIComponent(existing.id)}`, {
          properties: { hs_note_body: body, hs_timestamp: new Date().toISOString() },
        })
        return existing.id
      }
    }
    after = page.paging?.next?.after
    if (after && seen.has(after)) throw new Error('تعذر التحقق من المزامنة السابقة. حاول مجدداً.')
    if (after) seen.add(after)
  } while (after)
  const created = await api<{ id: string }>('POST', '/crm/v3/objects/notes', {
    properties: { hs_note_body: body, hs_timestamp: new Date().toISOString(), ...owner() },
    associations: [assoc(dealId, ASSOC.noteToDeal)],
  })
  return created.id
}

// Serialises double clicks within the website process; retries also rediscover the remote note.
const active = new Set<number>()
export async function syncConfirmedPayments(
  payload: Payload,
  id: number,
  version: string,
  confirmedBy: string,
) {
  if (active.has(id)) throw new Error('المزامنة جارية لهذا الطلب. انتظر ثم حاول مجدداً.')
  active.add(id)
  try {
    if (!hubspot.configured) throw new Error('HubSpot غير متصل على الخادم.')
    const application = await payload.findByID({ collection: 'applications', id, depth: 0 })
    if (application.type === 'product-search' || application.type === 'shipping-quote')
      throw new Error('هذا الخيار لدفعات الخدمات فقط.')
    if (version !== paymentSyncVersion(application.billing))
      throw new Error('توجد تغييرات غير محفوظة. احفظ الطلب أولاً ثم اضغط المزامنة.')
    const body = confirmedPaymentNote(application, confirmedBy)
    if (body.length > 65000) throw new Error('سجل الدفعات أكبر من الحد المسموح. تواصل مع الإدارة.')
    let dealId = application.hubspotDealId
    if (!dealId) {
      const result = await resendApplicationToHubSpot(payload, application)
      if (!result.ok) throw new Error('تعذر ربط العميل والطلب بـHubSpot. حاول مجدداً.')
      dealId = result.dealId
    }
    const deal = await call<{ properties: { dealname?: string } }>(
      'GET',
      `/crm/v3/objects/deals/${encodeURIComponent(dealId)}?properties=dealname`,
    )
    if (!deal.properties.dealname?.includes(application.reference))
      throw new Error('رقم صفقة HubSpot لا يطابق الطلب. راجعه قبل المزامنة.')
    await upsertPaymentNote(dealId, application.reference, body)
    return { ok: true, dealId }
  } finally {
    active.delete(id)
  }
}
