import { ChevronRight } from 'lucide-react'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import {
  StatusPill,
  Stepper,
  portalLocale,
  requestTitle,
  statusLabel,
} from '@/components/portal/shared'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { describeDetails } from '@/lib/application-rows'
import { currentCustomer } from '@/lib/portal/accounts'
import { requestFor } from '@/lib/portal/requests'
import { getSiteSettings } from '@/lib/queries'
import { localePath, whatsappLink } from '@/lib/url'

import type { FORMS } from '@/forms/definitions'
import type { Locale } from '@/i18n/routing'

export default async function PortalRequestPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>
}) {
  const { locale: raw, id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const locale = portalLocale(raw, `/portal/requests/${encodeURIComponent(id)}`)
  setRequestLocale(locale)
  const customer = await currentCustomer()
  if (!customer) redirect(localePath(locale, '/portal/login'))

  const request = await requestFor(customer, id)
  if (!request) notFound()

  const [t, apply, format, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'portal' }),
    getTranslations({ locale, namespace: 'apply' }),
    getFormatter({ locale }),
    getSiteSettings(locale),
  ])
  const date = (iso: string) => format.dateTime(new Date(iso), 'long')
  const title = requestTitle(t, request, (type) =>
    apply(`types.${type}.title` as 'types.consultation.title'),
  )
  const answers = request.application
    ? await describeDetails(
        request.application.type as keyof typeof FORMS,
        (request.application.details ?? {}) as Record<string, unknown>,
        { locale, files: false },
      )
    : []
  const ask = request.reference
    ? t('request.askText', { reference: request.reference })
    : t('request.askTextNoRef', { service: title })

  return (
    <>
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-caption font-semibold text-text-brand no-underline hover:underline"
      >
        <ChevronRight size={16} aria-hidden="true" className="ltr:rotate-180" />
        {t('request.back')}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 text-heading">
            {request.reference ? t('request.title', { reference: request.reference }) : title}
          </h1>
          {request.reference ? <p className="mt-1 text-body-lg text-text">{title}</p> : null}
          <p className="mt-2 text-caption text-text-muted">
            {t('request.updated', { date: date(request.updatedAt) })}
          </p>
        </div>
        <StatusPill
          progress={request.progress}
          label={statusLabel(t, request.progress, request.dueDate, date)}
        />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-6 shadow-card md:p-8">
            <Stepper
              progress={request.progress}
              label={(step) =>
                step === 'due' && request.dueDate
                  ? t('steps.dueOn', { date: date(request.dueDate) })
                  : t(`steps.${step}`)
              }
            />
          </section>

          {answers.length > 0 ? (
            <section className="rounded-xl border border-border bg-surface p-6 shadow-card md:p-8">
              <h2 className="text-h3 text-heading">{t('request.yourRequest')}</h2>
              <dl className="mt-4 divide-y divide-border">
                {answers.map((row, index) => (
                  <div key={index} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                    <dt className="text-caption font-semibold text-text-muted">{row.label}</dt>
                    <dd className="whitespace-pre-wrap text-text">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl bg-gradient-deep p-6 text-white">
            <h2 className="text-h3 text-white">{t('request.help')}</h2>
            <ButtonLink
              href={whatsappLink(settings.whatsappNumber, ask)}
              variant="primary"
              className="mt-4 w-full"
              external
            >
              <WhatsAppIcon size={18} />
              {t('request.ask')}
            </ButtonLink>
          </section>
        </aside>
      </div>
    </>
  )
}
