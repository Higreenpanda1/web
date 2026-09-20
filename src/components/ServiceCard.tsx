import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { ServiceIcon } from '@/components/ServiceIcon'
import { Card } from '@/components/ui/Card'
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
      className={cn(
        'group flex flex-col hover:shadow-lg',
        featured && 'border-[var(--brand-300)] bg-[var(--surface-tint)] md:col-span-2',
      )}
    >
      <span
        className={cn(
          'mb-4 inline-flex size-12 items-center justify-center rounded-[var(--radius)]',
          featured
            ? 'bg-[var(--brand-700)] text-white'
            : 'bg-[var(--brand-100)] text-[var(--brand-700)]',
        )}
      >
        <ServiceIcon name={service.icon} />
      </span>

      {featured ? (
        <p className="mb-1 text-caption font-semibold text-[var(--accent-text)]">
          {t('services.featured')}
        </p>
      ) : null}

      <h3 className="text-h3">
        <Link
          href={`/services/${service.slug}`}
          className="text-[var(--heading)] no-underline after:absolute after:inset-0 after:content-['']"
        >
          {service.title}
        </Link>
      </h3>

      <p className="mt-2 flex-1 text-[var(--text-muted)]">{service.summary}</p>

      <span className="mt-4 inline-flex items-center gap-1.5 font-semibold text-[var(--text-brand)]">
        {t('cta.learnMore')}
        <Arrow
          size={18}
          strokeWidth={1.5}
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
        />
      </span>
    </Card>
  )
}
