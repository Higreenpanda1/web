import { getTranslations } from 'next-intl/server'

import { FORMS, singleFields, type FieldDef } from '@/forms/definitions'

import type { NotificationRow } from './email'

/**
 * How a stored application reads to the team: its type's title and its
 * answers as label/value pairs, in English. Shared by the submit action
 * (email and HubSpot) and the "Resend to HubSpot" button, so a resent
 * request reads exactly like the first send.
 */

const CONTACT_FIELDS = ['name', 'country', 'whatsapp', 'email'] as const

/**
 * The answers as label/value pairs for the notification email, in English:
 * the team reads Arabic and Chinese, but the email is also what gets
 * forwarded to a bank or a visa agent, and the option codes ("virtual-basic")
 * are meaningless to anyone.
 */
export async function describeDetails(
  type: keyof typeof FORMS,
  details: Record<string, unknown>,
): Promise<NotificationRow[]> {
  const t = await getTranslations({ locale: 'en', namespace: 'apply' })
  const rows: NotificationRow[] = []

  const describe = (
    fields: readonly FieldDef[],
    answers: Record<string, unknown>,
    prefix: string,
  ) => {
    for (const field of fields) {
      if ((CONTACT_FIELDS as readonly string[]).includes(field.name)) continue
      const value = answers[field.name]
      if (value === undefined || value === null || value === '') continue

      const option = (code: string) =>
        t.has(`options.${field.name}.${code}`)
          ? t(`options.${field.name}.${code}`)
          : t.has(`options.common.${code}`)
            ? t(`options.common.${code}`)
            : code

      const rendered = Array.isArray(value)
        ? value.map((v) => (field.kind === 'file' ? String(v) : option(String(v)))).join(', ')
        : field.kind === 'select'
          ? option(String(value))
          : String(value)

      rows.push({ label: prefix + t(`fields.${field.name}`), value: rendered })
    }
  }

  describe(singleFields(FORMS[type]), details, '')
  // One block of rows per item: "Product 2 · Quantity".
  for (const step of FORMS[type].steps) {
    const repeat = step.repeat
    if (!repeat || !Array.isArray(details[repeat.name])) continue
    for (const [index, item] of (details[repeat.name] as Record<string, unknown>[]).entries()) {
      const label = t(`repeat.${repeat.name}.item` as 'repeat.products.item', { n: index + 1 })
      describe(step.fields, item, `${label} · `)
    }
  }
  return rows
}

export async function typeLabel(type: keyof typeof FORMS): Promise<string> {
  const t = await getTranslations({ locale: 'en', namespace: 'apply' })
  return t(`types.${type}.title`)
}
