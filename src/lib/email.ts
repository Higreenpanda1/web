import { email as emailConfig } from './env'
import { getPayloadClient } from './payload'

import type { Enquiry } from '@/payload-types'

/**
 * Enquiry notifications.
 *
 * The enquiry is written to Postgres first and emailed second, and a failure
 * here is logged rather than thrown. Storage is the record of truth; email is
 * a notification about it. A transactional provider, a mailbox provider and a
 * DNS record are three things that can each be down or misconfigured on a day
 * a lead arrives, and none of them should be able to lose one. The site owns
 * the enquiry the moment it is submitted.
 */

export async function sendEnquiryNotification(enquiry: Enquiry, serviceTitle: string | null) {
  if (!emailConfig.configured || emailConfig.notifyTo.length === 0) {
    console.warn(
      `[enquiry ${enquiry.reference}] stored, but no email provider is configured — set RESEND_API_KEY.`,
    )
    return false
  }

  const payload = await getPayloadClient()

  try {
    await payload.sendEmail({
      to: emailConfig.notifyTo,
      replyTo: enquiry.email || undefined,
      subject: `New enquiry ${enquiry.reference} — ${enquiry.name} (${enquiry.country})`,
      text: plainText(enquiry, serviceTitle),
      html: html(enquiry, serviceTitle),
    })
    return true
  } catch (error) {
    // Never rethrow: the visitor has already been told we have their enquiry,
    // and we do — it is in the database.
    console.error(`[enquiry ${enquiry.reference}] notification failed`, error)
    return false
  }
}

export type NotificationRow = { label: string; value: string }

export type ApplicationNotification = {
  reference: string
  typeLabel: string
  name: string
  country: string
  whatsapp: string
  email: string | null
  serviceTitle: string | null
  headline: string
  locale: string
  sourcePath: string | null
  rows: NotificationRow[]
}

/**
 * The application forms' notification. Same contract as the enquiry one:
 * stored first, emailed second, never thrown. The body is the answers as a
 * label/value table, built by the action from the form definition, so this
 * function knows nothing about which form it was.
 */
export async function sendApplicationNotification(app: ApplicationNotification) {
  if (!emailConfig.configured || emailConfig.notifyTo.length === 0) {
    console.warn(
      `[application ${app.reference}] stored, but no email provider is configured — set RESEND_API_KEY.`,
    )
    return false
  }

  const payload = await getPayloadClient()
  const summary = [app.typeLabel, app.headline].filter(Boolean).join(' — ')
  const head: NotificationRow[] = [
    { label: 'Reference', value: app.reference },
    { label: 'Form', value: app.typeLabel },
    ...(app.serviceTitle ? [{ label: 'Service page', value: app.serviceTitle }] : []),
    { label: 'Name', value: app.name },
    { label: 'Country', value: app.country },
    { label: 'WhatsApp', value: app.whatsapp },
    ...(app.email ? [{ label: 'Email', value: app.email }] : []),
    { label: 'Language', value: app.locale },
    { label: 'Page', value: app.sourcePath ?? '—' },
  ]

  try {
    await payload.sendEmail({
      to: emailConfig.notifyTo,
      replyTo: app.email || undefined,
      subject: `New application ${app.reference} — ${summary} — ${app.name} (${app.country})`,
      text: [
        `New application from higreenpanda.com`,
        ``,
        ...head.map((row) => `${row.label}: ${row.value}`),
        ``,
        `Answers:`,
        ...app.rows.map((row) => `${row.label}: ${row.value}`),
        ``,
        `Reply on WhatsApp: https://wa.me/${app.whatsapp.replace(/[^\d]/g, '')}`,
      ].join('\n'),
      html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.6">
<h2 style="color:#276B34;margin:0 0 4px">New application from higreenpanda.com</h2>
<p style="margin:0 0 16px;color:#4C574F">${escapeHtml(summary)}</p>
${table(head)}
<p style="color:#4C574F;margin:0 0 4px"><strong>Answers</strong></p>
${table(app.rows)}
<p><a href="https://wa.me/${app.whatsapp.replace(/[^\d]/g, '')}" style="background:#276B34;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Reply on WhatsApp</a></p>
</body></html>`,
    })
    return true
  } catch (error) {
    console.error(`[application ${app.reference}] notification failed`, error)
    return false
  }
}

function table(rows: NotificationRow[]): string {
  return `<table cellpadding="6" style="border-collapse:collapse;margin-bottom:20px">
${rows
  .map(
    (row) =>
      `<tr><td style="color:#4C574F;vertical-align:top"><strong>${escapeHtml(row.label)}</strong></td><td style="white-space:pre-wrap">${escapeHtml(row.value)}</td></tr>`,
  )
  .join('')}
</table>`
}

function plainText(enquiry: Enquiry, serviceTitle: string | null): string {
  return [
    `New enquiry from higreenpanda.com`,
    ``,
    `Reference:  ${enquiry.reference}`,
    `Name:       ${enquiry.name}`,
    `Country:    ${enquiry.country}`,
    `WhatsApp:   ${enquiry.whatsapp}`,
    enquiry.email ? `Email:      ${enquiry.email}` : null,
    `Service:    ${serviceTitle ?? enquiry.serviceOther ?? '—'}`,
    `Language:   ${enquiry.meta?.locale ?? '—'}`,
    `Page:       ${enquiry.meta?.sourcePath ?? '—'}`,
    ``,
    `Message:`,
    enquiry.message,
    ``,
    `Reply on WhatsApp: https://wa.me/${enquiry.whatsapp.replace(/[^\d]/g, '')}`,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

function html(enquiry: Enquiry, serviceTitle: string | null): string {
  const rows: Array<[string, string]> = [
    ['Reference', enquiry.reference],
    ['Name', enquiry.name],
    ['Country', enquiry.country],
    ['WhatsApp', enquiry.whatsapp],
    ...(enquiry.email ? ([['Email', enquiry.email]] as Array<[string, string]>) : []),
    ['Service', serviceTitle ?? enquiry.serviceOther ?? '—'],
    ['Language', enquiry.meta?.locale ?? '—'],
    ['Page', enquiry.meta?.sourcePath ?? '—'],
  ]

  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.6">
<h2 style="color:#276B34;margin:0 0 16px">New enquiry from higreenpanda.com</h2>
<table cellpadding="6" style="border-collapse:collapse;margin-bottom:20px">
${rows
  .map(
    ([label, value]) =>
      `<tr><td style="color:#4C574F;vertical-align:top"><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`,
  )
  .join('')}
</table>
<p style="color:#4C574F;margin:0 0 4px"><strong>Message</strong></p>
<p style="white-space:pre-wrap;background:#F3FAF4;padding:14px;border-radius:8px;margin:0 0 20px">${escapeHtml(enquiry.message)}</p>
<p><a href="https://wa.me/${enquiry.whatsapp.replace(/[^\d]/g, '')}" style="background:#276B34;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Reply on WhatsApp</a></p>
</body></html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
