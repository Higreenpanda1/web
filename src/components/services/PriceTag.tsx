import { getTranslations } from 'next-intl/server'

import { cn } from '@/lib/cn'
import { formatYuan, hasPrice } from '@/lib/price'

import type { Locale } from '@/i18n/routing'
import type { PriceUnit } from '@/lib/catalogue'
import type { Service } from '@/payload-types'

/**
 * "from ¥8,200 / year". One component so the card, the detail page and the
 * category lists never disagree about how a price reads. Renders nothing
 * when the service has no starting price — silence, not "contact us".
 */
export async function PriceTag({
  service,
  locale,
  size = 'md',
  inverse = false,
  className,
}: {
  service: Pick<Service, 'priceFrom' | 'priceUnit'>
  locale: Locale
  size?: 'sm' | 'md' | 'lg'
  inverse?: boolean
  className?: string
}) {
  if (!hasPrice(service)) return null
  const t = await getTranslations({ locale })
  const unit = t(`services.priceUnit.${(service.priceUnit ?? 'once') as PriceUnit}`)

  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-baseline gap-x-1.5',
        size === 'sm' && 'text-caption',
        size === 'lg' && 'text-body-lg',
        inverse ? 'text-brand-100' : 'text-text-muted',
        className,
      )}
    >
      <span>{t('services.priceFrom')}</span>
      <strong
        className={cn(
          'ltr-nums font-bold',
          size === 'lg' ? 'text-h2' : 'text-body-lg',
          inverse ? 'text-white' : 'text-heading',
        )}
      >
        {formatYuan(service.priceFrom, locale)}
      </strong>
      {unit ? <span>{unit}</span> : null}
    </span>
  )
}
