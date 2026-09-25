import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { PriceTag } from '@/components/services/PriceTag'
import { ServiceIcon } from '@/components/ServiceIcon'
import { ButtonLink } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import { whatsappLink } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { ApplicationType } from '@/lib/catalogue'
import type { Service, SiteSetting } from '@/payload-types'

/**
 * The service an article leads to, as a card inside the article: what it is,
 * from what price, what is included, and the two ways to start — the
 * application form and WhatsApp. This is where a reader who has just learned
 * how much a shipment costs becomes an enquiry. Rendered once after the body
 * and once, compact, in the sidebar.
 */
export async function ServiceCta({
  service,
  locale,
  settings,
  variant = 'inline',
}: {
  service: Service
  locale: Locale
  settings: SiteSetting
  variant?: 'inline' | 'sidebar'
}) {
  const t = await getTranslations({ locale })
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight
  const applicationType = (service.applicationType ?? null) as ApplicationType | null
  const primaryHref = applicationType
    ? `/apply/${applicationType}?service=${service.slug}`
    : `/services/${service.slug}`
  const primaryLabel = applicationType
    ? t(`apply.types.${applicationType}.cta`)
    : t('cta.seeService')
  const whatsapp = whatsappLink(
    settings.whatsappNumber,
    t('blog.whatsappPrefill', { service: service.title }),
  )
  const highlights = (service.highlights ?? []).slice(0, variant === 'inline' ? 4 : 3)
  const compact = variant === 'sidebar'

  return (
    <aside
      aria-labelledby={`cta-${variant}-heading`}
      className={cn(
        'relative isolate overflow-hidden rounded-xl border border-brand-200 bg-surface-tint-soft',
        compact ? 'p-5' : 'p-6 sm:p-8',
      )}
      data-service-cta={service.slug}
    >
      <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden="true" />
      <div className={cn('flex gap-4', compact ? 'items-start' : 'items-start sm:gap-6')}>
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-lg bg-surface text-text-brand shadow-card',
            compact ? 'size-10' : 'size-12',
          )}
        >
          <ServiceIcon name={service.icon} size={compact ? 20 : 24} />
        </span>
        <div className="min-w-0 flex-1">
          <Eyebrow className="mb-2">{t('blog.nextStepEyebrow')}</Eyebrow>
          <h2
            id={`cta-${variant}-heading`}
            className={cn('text-balance', compact ? 'text-h3' : 'text-h2')}
          >
            <Link href={`/services/${service.slug}`} className="no-underline hover:underline">
              {service.title}
            </Link>
          </h2>
          {!compact ? <p className="mt-2 text-text-muted">{t('blog.nextStepLead')}</p> : null}
          <p className={cn('text-text-muted', compact ? 'mt-2 text-caption' : 'mt-3')}>
            {service.summary}
          </p>
          {highlights.length > 0 ? (
            <ul className={cn('list-none p-0', compact ? 'mt-3 space-y-1.5' : 'mt-4 space-y-2')}>
              {highlights.map((item) => (
                <li
                  key={item.id ?? item.text}
                  className={cn('flex items-start gap-2', compact ? 'text-caption' : 'text-body')}
                >
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-text-brand" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <PriceTag
            service={service}
            locale={locale}
            size={compact ? 'sm' : 'md'}
            className="mt-4"
          />
          <div className={cn('flex flex-wrap gap-3', compact ? 'mt-4' : 'mt-6')}>
            <ButtonLink href={primaryHref} size={compact ? 'sm' : 'md'}>
              {primaryLabel}
              <Arrow aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink
              href={whatsapp}
              variant="secondary"
              size={compact ? 'sm' : 'md'}
              aria-label={t('cta.whatsappAria', { number: settings.whatsappNumber })}
            >
              <WhatsAppIcon className="size-4" />
              {t('cta.whatsapp')}
            </ButtonLink>
          </div>
        </div>
      </div>
    </aside>
  )
}
