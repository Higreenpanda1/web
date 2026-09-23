import { SERVICE_CATEGORIES, type ServiceCategory } from './catalogue'

import type { Service } from '@/payload-types'

export type ServiceGroup = { category: ServiceCategory; services: Service[] }

/**
 * Services grouped in catalogue order, empty categories dropped. The order
 * inside a group is whatever the query returned (the `order` field), so an
 * editor controls position with one number and never touches code.
 */
export function groupServices(services: Service[]): ServiceGroup[] {
  return SERVICE_CATEGORIES.map((category) => ({
    category,
    services: services.filter((service) => (service.category ?? 'import') === category),
  })).filter((group) => group.services.length > 0)
}
