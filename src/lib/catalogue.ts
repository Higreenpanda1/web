/**
 * The shape of the service catalogue, in one place.
 *
 * The Services collection, the seed, the icon map and the services index all
 * need the same three lists — categories, application types and icon names —
 * and they used to drift: a value added to the collection's select but not to
 * the seed type compiled, and then failed at seed time. Keeping them here as
 * `as const` tuples means the Payload select options, the TypeScript unions
 * and the message-catalogue keys are all derived from one source.
 *
 * Nothing here is user-facing text. Labels live in src/messages/*.json under
 * `services.categories.*` and `apply.types.*`, so they are translated like
 * everything else rather than hard-coded in English on the admin side.
 */

/**
 * How the services index is grouped. Order here is display order. Twenty-odd
 * services in one flat grid is a wall; six named groups is a menu.
 */
export const SERVICE_CATEGORIES = [
  'import',
  'company',
  'banking',
  'ecommerce',
  'visas',
  'consulting',
] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

/**
 * The structured request forms. A service points at one of these and its
 * page then leads with "Start your application" instead of the generic
 * enquiry form. `none` keeps the generic form, pre-selected to the service.
 */
export const APPLICATION_TYPES = [
  'consultation',
  'company-registration',
  'visa-invitation',
  'visa',
  'product-search',
  'shipping-quote',
  'account-opening',
  'store-setup',
  'trademark',
] as const
export type ApplicationType = (typeof APPLICATION_TYPES)[number]

export function isApplicationType(value: unknown): value is ApplicationType {
  return typeof value === 'string' && (APPLICATION_TYPES as readonly string[]).includes(value)
}

/** Single-weight Lucide line icons; the map to components is in ServiceIcon.tsx. */
export const SERVICE_ICONS = [
  'search',
  'factory',
  'clipboard-check',
  'ship',
  'building',
  'route',
  'shopping-cart',
  'lightbulb',
  'tent',
  'package',
  'plane',
  'file-check',
  'id-card',
  'users',
  'landmark',
  'wallet',
  'store',
  'calculator',
  'map-pin',
  'badge-check',
  'file-pen',
] as const
export type ServiceIconName = (typeof SERVICE_ICONS)[number]

/**
 * What a "from" price is per. Prices are stored as whole yuan; the unit only
 * changes the suffix ("/ year", "/ class"). Kept as a code, not text, so the
 * suffix is translated from the catalogue rather than typed twice by editors.
 */
export const PRICE_UNITS = ['once', 'year', 'month', 'class'] as const
export type PriceUnit = (typeof PRICE_UNITS)[number]
