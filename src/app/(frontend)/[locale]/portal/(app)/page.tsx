import { ChevronLeft, Plus } from 'lucide-react'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { StatusPill, portalLocale, requestTitle, statusLabel } from '@/components/portal/shared'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import { currentCustomer } from '@/lib/portal/accounts'
import { requestsFor } from '@/lib/portal/requests'
import { localePath } from '@/lib/url'

import type { Locale } from '@/i18n/routing'

export default async function PortalRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ locale: raw }, { tab }] = await Promise.all([params, searchParams])
  const locale = portalLocale(raw, '/portal')
  setRequestLocale(locale)
  const customer = await currentCustomer()
  if (!customer) redirect(localePath(locale, '/portal/login'))

  const [t, apply, format, requests] = await Promise.all([
    getTranslations({ locale, namespace: 'portal' }),
    getTranslations({ locale, namespace: 'apply' }),
    getFormatter({ locale }),
    requestsFor(customer),
  ])
  const date = (iso: string) => format.dateTime(new Date(iso), 'long')
  const typeTitle = (type: string) => apply(`types.${type}.title` as 'types.consultation.title')

  const showCompleted = tab === 'completed'
  const shown = requests.filter((request) => request.progress.closed === showCompleted)
  const heading =
    customer.role === 'owner' && customer.company
      ? t('list.titleCompany', { company: customer.company })
      : t('list.title')

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h2 text-heading">{heading}</h1>
        <ButtonLink href="/apply/consultation" size="sm">
          <Plus size={16} aria-hidden="true" />
          {t('list.new')}
        </ButtonLink>
      </div>

      <div className="mt-6 flex gap-2 border-b border-border" role="tablist">
        {(
          [
            ['current', '/portal', !showCompleted],
            ['completed', '/portal?tab=completed', showCompleted],
          ] as const
        ).map(([key, href, active]) => (
          <Link
            key={key}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 font-semibold no-underline',
              active
                ? 'border-accent text-heading'
                : 'border-transparent text-text-muted hover:text-heading',
            )}
          >
            {t(`list.${key}`)}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-text-muted">
          {t('list.empty')}
        </p>
      ) : (
        <ul className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <li
            aria-hidden="true"
            className="hidden grid-cols-[13.5rem_1fr_9rem_minmax(12rem,auto)_6rem] gap-4 border-b border-border bg-surface-tint-soft px-5 py-3 text-caption font-semibold text-text-muted md:grid"
          >
            <span>{t('list.reference')}</span>
            <span>{t('list.service')}</span>
            <span>{t('list.date')}</span>
            <span>{t('list.status')}</span>
            <span />
          </li>
          {shown.map((request) => (
            <li key={request.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/portal/requests/${encodeURIComponent(request.id)}`}
                className="grid gap-x-4 gap-y-2 px-5 py-4 text-text no-underline transition-colors hover:bg-surface-tint-soft md:grid-cols-[13.5rem_1fr_9rem_minmax(12rem,auto)_6rem] md:items-center"
              >
                <span className="ltr-nums whitespace-nowrap text-caption text-text-muted md:text-body md:text-text">
                  {request.reference ?? '—'}
                </span>
                <span className="font-semibold text-heading">
                  {requestTitle(t, request, typeTitle)}
                </span>
                <span className="text-caption text-text-muted md:text-body">
                  {date(request.createdAt)}
                </span>
                <span>
                  <StatusPill
                    progress={request.progress}
                    label={statusLabel(t, request.progress, request.dueDate, date)}
                  />
                </span>
                <span className="hidden items-center gap-1 font-semibold text-text-brand md:inline-flex">
                  {t('list.details')}
                  <ChevronLeft size={16} aria-hidden="true" className="ltr:rotate-180" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
