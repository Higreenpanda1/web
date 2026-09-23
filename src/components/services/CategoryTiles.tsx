import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { CATEGORY_ICON, ServiceIcon } from '@/components/ServiceIcon'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

import type { Locale } from '@/i18n/routing'
import type { ServiceGroup } from '@/lib/services'

/**
 * The six areas of the business as a grid of tiles, each naming the services
 * inside it. This is what the homepage shows instead of nine cards: a visitor
 * who wants a visa should not have to scroll past sourcing and inspection to
 * learn we do visas. Every service name is a real link, so the tile is also
 * the sitemap a first-time visitor actually reads.
 */
export async function CategoryTiles({
  groups,
  locale,
  className,
}: {
  groups: ServiceGroup[]
  locale: Locale
  className?: string
}) {
  const t = await getTranslations({ locale })
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <ul
      className={cn(
        'grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {groups.map(({ category, services }) => (
        <li
          key={category}
          className="lift flex min-w-0 flex-col rounded-lg border border-border-soft bg-surface p-6 shadow-card"
        >
          <div className="flex items-center gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-tint text-text-brand">
              <ServiceIcon name={CATEGORY_ICON[category]} size={24} />
            </span>
            <div className="min-w-0">
              <h3 className="text-h3">
                <Link
                  href={`/services#${category}`}
                  className="text-heading no-underline hover:text-text-brand"
                >
                  {t(`services.categories.${category}.title`)}
                </Link>
              </h3>
              <p className="text-caption text-text-muted">
                {t('services.categoryCount', { count: services.length })}
              </p>
            </div>
          </div>

          <ul className="mt-5 flex-1 list-none space-y-1 p-0">
            {services.slice(0, 5).map((service) => (
              <li key={service.id}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group flex items-center gap-2 py-1 text-text no-underline hover:text-text-brand"
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full bg-brand-400 transition-colors group-hover:bg-brand-600"
                  />
                  <span className="min-w-0 flex-1 truncate">{service.title}</span>
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href={`/services#${category}`}
            className="mt-5 inline-flex items-center gap-1.5 self-start font-semibold text-text-brand no-underline"
          >
            {t('cta.allServices')}
            <Arrow size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
