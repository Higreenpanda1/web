import { formatNumber } from '@/i18n/format'

import type { Locale } from '@/i18n/routing'
import type { Service } from '@/payload-types'

/**
 * "¥8,200" in both languages. The yuan sign goes before the figure in Arabic
 * too — that is how the owner's own price list writes it, and how the
 * audience reads Chinese prices on Alibaba. Wrap the result in `.ltr-nums`
 * so the sign and digits never split across a bidi boundary.
 */
export function formatYuan(amount: number, locale: Locale): string {
  return `¥${formatNumber(Math.round(amount), locale)}`
}

export function hasPrice(service: Pick<Service, 'priceFrom'>): service is Service & {
  priceFrom: number
} {
  return typeof service.priceFrom === 'number' && service.priceFrom > 0
}
