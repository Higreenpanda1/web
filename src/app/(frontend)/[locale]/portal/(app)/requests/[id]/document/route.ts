import { headers } from 'next/headers'

import { billLines, type BillingItem } from '@/lib/billing'
import { HIGP, renderBillingDocument } from '@/lib/billing-document'
import { currentCustomer } from '@/lib/portal/accounts'
import { portalDocuments } from '@/lib/portal/documents'
import { requestFor } from '@/lib/portal/requests'

/**
 * A client's own quote or invoice, as the same printable page the team prints
 * from the admin (src/lib/billing-document.ts): ?doc=quote, or
 * ?doc=invoice&stage=deposit|balance|full. Only documents the portal lists
 * for this request are served (src/lib/portal/documents.ts).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const customer = await currentCustomer()
  if (!customer) return new Response('Not found', { status: 404 })
  const found = await requestFor(customer, decodeURIComponent((await params).id))
  const application = found?.application
  if (!found || !application) return new Response('Not found', { status: 404 })

  const url = new URL(request.url)
  const kind = url.searchParams.get('doc') === 'invoice' ? 'invoice' : 'quote'
  const stage = url.searchParams.get('stage')
  const doc = portalDocuments(application.type, application.billing, found.progress).find((d) =>
    d.kind === 'quote' ? kind === 'quote' : kind === 'invoice' && d.stage === stage,
  )
  if (!doc) return new Response('Not found', { status: 404 })

  const details = (application.details ?? {}) as Record<string, unknown>
  const html = renderBillingDocument({
    issuer: HIGP,
    kind: doc.kind,
    stage: doc.kind === 'invoice' ? doc.stage : undefined,
    reference: application.reference,
    date: new Date().toISOString().slice(0, 10),
    client: {
      name: application.name,
      company:
        application.billing?.clientCompany ||
        (typeof details.companyName === 'string' ? details.companyName : null),
      country: application.country,
      whatsapp: application.whatsapp,
      email: application.email,
    },
    lines: billLines((application.billing?.items ?? []) as BillingItem[]),
    paidOn: doc.kind === 'invoice' ? doc.paidOn : null,
    nonce: (await headers()).get('x-nonce'),
  })
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
