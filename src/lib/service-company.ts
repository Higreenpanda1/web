import type { ServiceCategory } from './catalogue'

/**
 * Which of the two companies offers a service (owner, 28 October 2026).
 * Nasher International Trading does import and sourcing; everything else
 * (company, banking, e-commerce, visas, consulting) is HIGP Consulting &
 * Accounting. Decided by category, so a service an editor adds to "Import"
 * lands under Nasher without touching code.
 */
export const SERVICE_COMPANIES = ['higp', 'nasher'] as const
export type ServiceCompany = (typeof SERVICE_COMPANIES)[number]

export function isServiceCompany(value: unknown): value is ServiceCompany {
  return typeof value === 'string' && (SERVICE_COMPANIES as readonly string[]).includes(value)
}

export function serviceCompany(service: { category?: ServiceCategory | null }): ServiceCompany {
  return (service.category ?? 'import') === 'import' ? 'nasher' : 'higp'
}

/**
 * Services no longer offered, kept out of every list and page without
 * deleting them from the CMS: the business visa (owner, 28 October 2026)
 * and trade-fair accompaniment, dropped so Nasher reads as a specialist.
 */
export const RETIRED_SERVICES: readonly string[] = ['business-visa', 'trade-fair-support']

export const isRetiredService = (slug?: string | null) =>
  Boolean(slug && RETIRED_SERVICES.includes(slug))

/** The services page link for one area, inside the company that offers it. */
export const categoryHref = (category: ServiceCategory) =>
  `/services?company=${serviceCompany({ category })}#${category}`
