'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'

import { FORMS, allFields } from '@/forms/definitions'
import { isVisible, reader, validateApplication } from '@/forms/schema'
import { checkDocuments, documentFileName, formatSize } from '@/lib/documents'
import { storeDocuments } from '@/lib/documents-store'
import {
  sendApplicationConfirmation,
  sendApplicationNotification,
  type NotificationRow,
} from '@/lib/email'
import { syncApplicationToHubSpot } from '@/lib/hubspot'
import { isApplicationType } from '@/lib/catalogue'
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/form-fields'
import { verifyFormToken } from '@/lib/form-guard'
import { getPayloadClient } from '@/lib/payload'
import { consume, networkPrefix } from '@/lib/rate-limit'

import type { Locale } from '@/i18n/routing'

/**
 * The application forms' only entry point — the structured counterpart of
 * src/app/actions/enquiry.ts, with the same order of operations: bot checks,
 * rate limit, validation, write to Postgres, then a best-effort email. The
 * validation is derived from the form definition, so a hidden conditional
 * field is never required and never stored.
 */

export type ApplicationState =
  | { status: 'idle' }
  | { status: 'success'; reference: string }
  | { status: 'error'; errorKey: string; fieldErrors?: Record<string, string> }

const RATE_LIMIT = 5
const RATE_WINDOW_MS = 10 * 60 * 1000
const CONTACT_FIELDS = ['name', 'country', 'whatsapp', 'email'] as const

export async function submitApplication(
  _previous: ApplicationState,
  formData: FormData,
): Promise<ApplicationState> {
  const headerList = await headers()
  const locale = (formData.get('locale') === 'en' ? 'en' : 'ar') as Locale

  const type = formData.get('type')
  if (!isApplicationType(type)) return { status: 'error', errorKey: 'generic' }
  const def = FORMS[type]

  const guard = verifyFormToken(formData.get(TIMESTAMP_FIELD), formData.get(HONEYPOT_FIELD))
  if (!guard.ok) {
    if (guard.reason === 'honeypot') {
      return { status: 'success', reference: generateReference() }
    }
    return { status: 'error', errorKey: guard.reason === 'too-fast' ? 'tooFast' : 'generic' }
  }

  const prefix = networkPrefix(headerList.get('x-real-ip') ?? headerList.get('x-forwarded-for'))
  if (!consume(`application:${prefix}`, RATE_LIMIT, RATE_WINDOW_MS).allowed) {
    return { status: 'error', errorKey: 'rateLimited' }
  }

  const read = reader(formData)
  const result = validateApplication(def, read)
  // Files are checked even when the text has errors, so the visitor hears
  // about a missing passport in the same round trip, not the next one.
  const files = await checkDocuments(
    allFields(def),
    (name) => formData.get(name),
    (field) => isVisible(field, read),
  )
  if (!result.ok || !files.ok) {
    return {
      status: 'error',
      errorKey: 'stepIncomplete',
      fieldErrors: { ...(result.ok ? {} : result.errors), ...(files.ok ? {} : files.errors) },
    }
  }

  const { name, country, whatsapp, email, ...details } = result.details as Record<
    string,
    unknown
  > & { name: string; country: string; whatsapp: string; email?: string }

  const serviceRaw = formData.get('service')
  const serviceId =
    typeof serviceRaw === 'string' && /^\d+$/.test(serviceRaw) ? Number(serviceRaw) : null

  const payload = await getPayloadClient()
  const reference = generateReference()
  const headline = def.headline(details).slice(0, 200)

  // The documents are written before the row so the row can say where they
  // are; storeDocuments never throws, and the email carries them regardless.
  const stored = await storeDocuments(reference, files.documents)
  for (const doc of files.documents) {
    const kept = stored.find((item) => item.field === doc.field)
    details[doc.field] =
      `${documentFileName(reference, doc)} (${formatSize(doc.bytes.byteLength)})` +
      (kept ? '' : ' — not saved on the server, see the email')
  }

  try {
    const application = await payload.create({
      collection: 'applications',
      data: {
        reference,
        type,
        status: 'new',
        service: serviceId,
        name,
        country,
        whatsapp,
        email: email || undefined,
        headline: headline || undefined,
        details,
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
      typeof application.service === 'object' && application.service
        ? application.service.title
        : null
    const label = await typeLabel(type)
    const rows = await describeDetails(type, details)
    const attachments = files.documents.map((doc) => ({
      filename: documentFileName(reference, doc),
      mime: doc.mime,
      content: doc.bytes,
    }))
    const [notified] = await Promise.all([
      sendApplicationNotification({
        reference,
        typeLabel: label,
        name,
        country,
        whatsapp,
        email: email || null,
        serviceTitle,
        headline,
        locale,
        sourcePath: headerList.get('x-pathname'),
        rows,
        attachments,
      }),
      // Best-effort, like the email: logs on failure, never throws.
      syncApplicationToHubSpot(
        {
          reference,
          type,
          typeLabel: label,
          name,
          country,
          whatsapp,
          email: email || null,
          headline,
          rows,
        },
        attachments,
      ),
      email ? sendConfirmation({ to: email, name, reference, type, locale }) : false,
    ])

    if (notified) {
      await payload
        .update({
          collection: 'applications',
          id: application.id,
          data: { notifiedAt: new Date().toISOString() },
        })
        .catch((error) => {
          console.error(`[application ${reference}] could not record notifiedAt`, error)
        })
    }

    return { status: 'success', reference }
  } catch (error) {
    console.error('[application] could not store submission', error)
    return { status: 'error', errorKey: 'generic' }
  }
}

/**
 * The answers as label/value pairs for the notification email, in English:
 * the team reads Arabic and Chinese, but the email is also what gets
 * forwarded to a bank or a visa agent, and the option codes ("virtual-basic")
 * are meaningless to anyone.
 */
async function describeDetails(
  type: keyof typeof FORMS,
  details: Record<string, unknown>,
): Promise<NotificationRow[]> {
  const t = await getTranslations({ locale: 'en', namespace: 'apply' })
  const rows: NotificationRow[] = []

  for (const field of allFields(FORMS[type])) {
    if ((CONTACT_FIELDS as readonly string[]).includes(field.name)) continue
    const value = details[field.name]
    if (value === undefined || value === null || value === '') continue

    const option = (code: string) =>
      t.has(`options.${field.name}.${code}`)
        ? t(`options.${field.name}.${code}`)
        : t.has(`options.common.${code}`)
          ? t(`options.common.${code}`)
          : code

    const rendered = Array.isArray(value)
      ? value.map((v) => option(String(v))).join(', ')
      : field.kind === 'select'
        ? option(String(value))
        : String(value)

    rows.push({ label: t(`fields.${field.name}`), value: rendered })
  }
  return rows
}

/** The client's confirmation, in the language they filled the form in. */
async function sendConfirmation(args: {
  to: string
  name: string
  reference: string
  type: keyof typeof FORMS
  locale: Locale
}) {
  const t = await getTranslations({ locale: args.locale, namespace: 'confirmationEmail' })
  const apply = await getTranslations({ locale: args.locale, namespace: 'apply' })
  const typeTitle = apply(`types.${args.type}.title`)
  const values = { name: args.name, reference: args.reference, type: typeTitle }
  return sendApplicationConfirmation({
    to: args.to,
    name: args.name,
    reference: args.reference,
    typeTitle,
    locale: args.locale,
    text: {
      subject: t('subject', values),
      greeting: t('greeting', values),
      received: t('received', values),
      reference: t('reference', values),
      next: t('next', values),
      questions: t('questions', values),
      signoff: t('signoff', values),
    },
  })
}

async function typeLabel(type: keyof typeof FORMS): Promise<string> {
  const t = await getTranslations({ locale: 'en', namespace: 'apply' })
  return t(`types.${type}.title`)
}

/** Same shape as an enquiry reference, different prefix, so the two are never confused. */
function generateReference(): string {
  const now = new Date()
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
  return `HGA-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`
}
