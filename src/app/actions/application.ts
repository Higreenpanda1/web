'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'

import { FORMS, itemFieldName, singleFields } from '@/forms/definitions'
import { isVisible, itemKeys, reader, validateApplication } from '@/forms/schema'
import {
  checkDocuments,
  checkFileSet,
  documentFileName,
  formatSize,
  type CheckedDocument,
} from '@/lib/documents'
import { storeDocuments } from '@/lib/documents-store'
import { describeDetails, typeLabel } from '@/lib/application-rows'
import { sendApplicationConfirmation, sendApplicationNotification } from '@/lib/email'
import { syncApplicationToHubSpot } from '@/lib/hubspot'
import { isApplicationType } from '@/lib/catalogue'
import { checkFormGuard } from '@/lib/form-guard'
import { getPayloadClient } from '@/lib/payload'
import { consume, networkPrefix } from '@/lib/rate-limit'

import type { FormDef } from '@/forms/definitions'
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

export async function submitApplication(
  _previous: ApplicationState,
  formData: FormData,
): Promise<ApplicationState> {
  const headerList = await headers()
  const rawLocale = formData.get('locale')
  const locale = (rawLocale === 'en' || rawLocale === 'zh' ? rawLocale : 'ar') as Locale

  const type = formData.get('type')
  if (!isApplicationType(type)) return { status: 'error', errorKey: 'generic' }
  const def = FORMS[type]

  const guard = checkFormGuard('application', formData)
  if (guard.drop) return { status: 'success', reference: generateReference() }
  if (guard.errorKey) return { status: 'error', errorKey: guard.errorKey }

  const prefix = networkPrefix(headerList.get('x-real-ip') ?? headerList.get('x-forwarded-for'))
  if (!consume(`application:${prefix}`, RATE_LIMIT, RATE_WINDOW_MS).allowed) {
    return { status: 'error', errorKey: 'rateLimited' }
  }

  const read = reader(formData)
  const result = validateApplication(def, read)
  // Files are checked even when the text has errors, so the visitor hears
  // about a missing passport in the same round trip, not the next one.
  const files = await checkDocuments(
    singleFields(def),
    (name) => formData.get(name),
    (field) => isVisible(field, read),
  )
  const itemFiles = await checkItemFiles(def, read, formData)
  if (!result.ok || !files.ok || Object.keys(itemFiles.errors).length > 0) {
    return {
      status: 'error',
      errorKey: 'stepIncomplete',
      fieldErrors: {
        ...(result.ok ? {} : result.errors),
        ...(files.ok ? {} : files.errors),
        ...itemFiles.errors,
      },
    }
  }
  const documents = [...files.documents, ...itemFiles.sets.flatMap((set) => set.documents)]

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
  const stored = await storeDocuments(reference, documents)
  const describe = (doc: CheckedDocument) =>
    `${documentFileName(reference, doc)} (${formatSize(doc.bytes.byteLength)})` +
    (stored.some((item) => item.field === doc.field)
      ? ''
      : ' — not saved on the server, see the email')
  for (const doc of files.documents) details[doc.field] = describe(doc)
  for (const set of itemFiles.sets) {
    const items = details[set.repeat] as Record<string, unknown>[] | undefined
    const item = items?.[set.position]
    if (item) item[set.field] = set.documents.map(describe)
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
    const attachments = documents.map((doc) => ({
      filename: documentFileName(reference, doc),
      mime: doc.mime,
      content: doc.bytes,
    }))
    const sourcePath = headerList.get('x-pathname')
    const [notified, synced] = await Promise.all([
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
        sourcePath,
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
          details,
          sourcePath,
          referrer: headerList.get('referer'),
          rows,
        },
        attachments,
      ),
      email ? sendConfirmation({ to: email, name, reference, type, locale }) : false,
    ])

    if (notified || synced) {
      const now = new Date().toISOString()
      await payload
        .update({
          collection: 'applications',
          id: application.id,
          data: {
            ...(notified ? { notifiedAt: now } : {}),
            ...(synced ? { hubspotSyncedAt: now, hubspotDealId: synced.dealId } : {}),
          },
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

type FileSet = {
  repeat: string
  position: number
  field: string
  documents: CheckedDocument[]
}

/**
 * The files of each item of a repeated step, such as each product's photos.
 * Error keys are the item's form names, like the text errors.
 */
async function checkItemFiles(
  def: FormDef,
  read: ReturnType<typeof reader>,
  formData: FormData,
): Promise<{ sets: FileSet[]; errors: Record<string, string> }> {
  const sets: FileSet[] = []
  const errors: Record<string, string> = {}
  for (const step of def.steps) {
    const repeat = step.repeat
    if (!repeat) continue
    for (const [position, key] of itemKeys(repeat, read).entries()) {
      for (const field of step.fields) {
        if (field.kind !== 'file') continue
        const name = itemFieldName(repeat, key, field.name)
        const { documents, error } = await checkFileSet(
          field,
          formData.getAll(name),
          `${repeat.item}${position + 1}-${field.name}-`,
        )
        if (error) errors[name] = error
        else if (documents.length > 0) {
          sets.push({ repeat: repeat.name, position, field: field.name, documents })
        }
      }
    }
  }
  return { sets, errors }
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

/** Same shape as an enquiry reference, different prefix, so the two are never confused. */
function generateReference(): string {
  const now = new Date()
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
  return `HGA-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`
}
