'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'

import { collectErrors, enquirySchema, toE164 } from '@/lib/enquiry-schema'
import { sendEnquiryNotification } from '@/lib/email'
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/form-fields'
import { verifyFormToken } from '@/lib/form-guard'
import { getPayloadClient } from '@/lib/payload'
import { consume, networkPrefix } from '@/lib/rate-limit'

import type { Locale } from '@/i18n/routing'

/**
 * The enquiry form's only entry point.
 *
 * It uses Payload's local API, which bypasses access control by design — which
 * is why `create` is closed on the Enquiries collection. The form works and
 * POST /api/enquiries stays shut to the internet.
 *
 * Order of operations matters. The enquiry is written to Postgres first and
 * emailed second, and an email failure does not fail the request: the visitor
 * is told we have their enquiry because we do. That is the direct lesson of
 * losing a day of enquiries when the MX records were wiped (brief section 6).
 */

export type EnquiryState =
  | { status: 'idle' }
  | { status: 'success'; reference: string }
  | { status: 'error'; errorKey: string; fieldErrors?: Record<string, string> }

const RATE_LIMIT = 5
const RATE_WINDOW_MS = 10 * 60 * 1000

export async function submitEnquiry(
  _previous: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const headerList = await headers()
  const locale = (formData.get('locale') === 'en' ? 'en' : 'ar') as Locale

  // --- Bot defences (honeypot + signed timing token) ------------------------
  const guard = verifyFormToken(formData.get(TIMESTAMP_FIELD), formData.get(HONEYPOT_FIELD))
  if (!guard.ok) {
    if (guard.reason === 'honeypot') {
      // Do not tell a bot it was caught. Report success and store nothing.
      return { status: 'success', reference: syntheticReference() }
    }
    return { status: 'error', errorKey: guard.reason === 'too-fast' ? 'tooFast' : 'generic' }
  }

  // --- Rate limit, keyed by network prefix rather than exact address --------
  const prefix = networkPrefix(headerList.get('x-real-ip') ?? headerList.get('x-forwarded-for'))
  const limit = consume(`enquiry:${prefix}`, RATE_LIMIT, RATE_WINDOW_MS)
  if (!limit.allowed) {
    return { status: 'error', errorKey: 'rateLimited' }
  }

  // --- Validation -----------------------------------------------------------
  const parsed = enquirySchema.safeParse({
    name: formData.get('name'),
    country: formData.get('country'),
    whatsapp: formData.get('whatsapp'),
    email: formData.get('email') ?? '',
    service: formData.get('service') ?? '',
    message: formData.get('message'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of collectErrors(parsed.error)) {
      fieldErrors[issue.field] ??= issue.key
    }
    return { status: 'error', errorKey: 'generic', fieldErrors }
  }

  const input = parsed.data
  const payload = await getPayloadClient()
  const reference = generateReference()

  // The select is a service id, or the sentinel "other".
  const serviceId =
    input.service && input.service !== 'other' && Number.isFinite(Number(input.service))
      ? Number(input.service)
      : null

  try {
    const enquiry = await payload.create({
      collection: 'enquiries',
      data: {
        reference,
        status: 'new',
        name: input.name,
        country: input.country,
        whatsapp: toE164(input.whatsapp),
        email: input.email || undefined,
        service: serviceId,
        serviceOther: serviceId ? undefined : 'other',
        message: input.message,
        meta: {
          locale,
          sourcePath: headerList.get('x-pathname') ?? undefined,
          referrer: headerList.get('referer')?.slice(0, 500) ?? undefined,
          userAgent: headerList.get('user-agent')?.slice(0, 500) ?? undefined,
          ipPrefix: prefix,
          submittedAt: new Date().toISOString(),
        },
      },
    })

    // Stored. Everything after this point is best-effort.
    const serviceTitle =
      typeof enquiry.service === 'object' && enquiry.service ? enquiry.service.title : null
    const notified = await sendEnquiryNotification(enquiry, serviceTitle)

    if (notified) {
      await payload
        .update({
          collection: 'enquiries',
          id: enquiry.id,
          data: { notifiedAt: new Date().toISOString() },
        })
        .catch((error) => {
          console.error(`[enquiry ${reference}] could not record notifiedAt`, error)
        })
    }

    return { status: 'success', reference }
  } catch (error) {
    console.error('[enquiry] could not store submission', error)
    return { status: 'error', errorKey: 'generic' }
  }
}

/** Human-quotable, sortable, and not guessable enough to enumerate. */
function generateReference(): string {
  const now = new Date()
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
  return `HGP-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`
}

/** Returned to a caught bot so it learns nothing. Never stored. */
function syntheticReference(): string {
  return generateReference()
}
