import { connection } from 'next/server'

import { EnquiryForm } from './EnquiryForm'
import { issueFormToken } from '@/lib/form-guard'
import { getServices } from '@/lib/queries'

import type { Locale } from '@/i18n/routing'

/**
 * Server wrapper for the form. It issues the signed timing token at render
 * time — the client never mints one — and loads the service list so the
 * "service of interest" select matches what is actually published.
 *
 * `connection()` opts the enclosing route out of static rendering. That is not
 * optional: a prerendered page would bake one timing token into the HTML at
 * build time, and every submission from it would be refused as stale once the
 * two-hour window passed. Doing it here rather than with `export const dynamic`
 * on each page means an editor can drop a CTA block with the form onto any CMS
 * page and it still works — the route becomes dynamic because the form is on
 * it, not because someone remembered to say so.
 */
export async function EnquiryFormSection({
  locale,
  compact = false,
}: {
  locale: Locale
  compact?: boolean
}) {
  await connection()
  const services = await getServices(locale, { limit: 20 })

  return (
    <EnquiryForm
      locale={locale}
      compact={compact}
      formToken={issueFormToken()}
      services={services.map((service) => ({ id: service.id, title: service.title }))}
    />
  )
}
