import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { ServiceIcon } from '@/components/ServiceIcon'
import { Card } from '@/components/ui/Card'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

import type { Locale } from '@/i18n/routing'
import type { Service } from '@/payload-types'

export async function ServiceCard({
  service,
  locale,
  featured = false,
}: {
  service: Service
  locale: Locale
  featured?: boolean
}) {
  const t = await getTranslations({ locale })
  // The arrow points the way the eye travels, which is the opposite direction
  // in Arabic. A mirrored icon is the one thing logical properties cannot fix.
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <Card
      as="li"
      interactive
      className={cn(
        'group relative flex flex-col',
        featured &&
          'border-transparent bg-gradient-brand text-white hover:border-transparent sm:col-span-2 lg:col-span-2',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            'inline-flex size-14 items-center justify-center rounded-lg transition-colors duration-300',
            featured
              ? 'bg-white/15 text-white'
              : 'bg-surface-tint text-text-brand group-hover:bg-brand-700 group-hover:text-white',
          )}
        >
          <ServiceIcon name={service.icon} />
        </span>
        {featured ? (
          <span className="rounded-full bg-white/15 px-3 py-1 text-eyebrow font-bold tracking-[0.1em] text-white uppercase">
            {t('services.featured')}
          </span>
        ) : null}
      </div>

      <h3 className={cn('mt-6', featured && 'text-h2 text-white')}>
        <Link
          href={`/services/${service.slug}`}
          className="text-inherit no-underline after:absolute after:inset-0 after:content-['']"
        >
          {service.title}
        </Link>
      </h3>

      <p
        className={cn(
          'mt-3 flex-1',
          featured ? 'max-w-[40rem] text-body-lg text-brand-100' : 'text-text-muted',
        )}
      >
        {service.summary}
      </p>

      <span
        className={cn(
          'mt-6 inline-flex items-center gap-1.5 font-semibold',
          featured ? 'text-white' : 'text-text-brand',
        )}
      >
        {t('cta.learnMore')}
        <Arrow
          size={18}
          strokeWidth={2}
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
        />
      </span>
    </Card>
  )
}
