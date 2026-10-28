/**
 * A product request read back for the team: the products the client asked
 * for, each with its photos, and the prices the team settles on.
 *
 * The form (src/forms/definitions.ts, 'product-search') stores the answers
 * in `details.products`, one object per product, and each photo as
 * "<file name> (<size>)" in that product's `photos` (and, since late
 * October 2026, any Excel or PDF file in its `productFiles`). Requests sent before
 * October 2026 had one product with its answers at the top level of
 * `details`; they read as a request for one product without photos.
 *
 * Kept free of Payload and Next imports so the unit tests can load it.
 */

export type OrderProduct = {
  /** 1-based, as the client numbered them ("Product 2"). */
  position: number
  productName: string
  productLink: string | null
  quantity: number | null
  unit: string | null
  targetPrice: number | null
  priceCurrency: string | null
  sizes: string | null
  colours: string | null
  specs: string | null
  /** Stored photo file names, in the order the client chose them. */
  photos: string[]
  /** Stored Excel or PDF files sent with the product, such as a product list. */
  files: string[]
}

/** A line of the team's final prices, as the `order.items` array stores it. */
export type OrderItem = {
  position?: number | null
  productName: string
  description?: string | null
  quantity?: number | null
  unit?: string | null
  unitPrice?: number | null
}

export const ORDER_CURRENCIES = ['usd', 'cny', 'aed', 'sar'] as const
export const ORDER_UNITS = ['pieces', 'sets', 'pairs', 'cartons', 'metres', 'kg'] as const

/**
 * How the client pays for the goods, as agreed with them order by order:
 * everything at once, or a deposit now and the balance before shipment.
 */
export const PAYMENT_TERMS = ['full', '50-50', '30-70'] as const
export type PaymentTerms = (typeof PAYMENT_TERMS)[number]

/** The deposit due now and the balance before shipment, to the cent. */
export function paymentSplit(
  total: number,
  terms: string | null | undefined,
): { share: number; deposit: number; balance: number } {
  const share = terms === '50-50' ? 0.5 : terms === '30-70' ? 0.3 : 1
  const cents = Math.round(total * 100)
  const deposit = Math.round(cents * share)
  return { share, deposit: deposit / 100, balance: (cents - deposit) / 100 }
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

const number = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : null
}

/**
 * "HGA-20261026-ABC123-product1-photos-2.jpg (2.4 MB)" → the file name, or
 * null when the entry is not a stored photo of this request (a photo the
 * server could not save says so after the size, and is only in the email).
 */
export function photoFileName(entry: unknown, reference: string): string | null {
  const name = storedName(entry)
  return name && isPhotoFileName(name, reference) ? name : null
}

/** The same for a product's Excel or PDF file. */
export function productFileName(entry: unknown, reference: string): string | null {
  const name = storedName(entry)
  return name && isProductFileName(name, reference) ? name : null
}

function storedName(entry: unknown): string | null {
  if (typeof entry !== 'string' || entry.includes('not saved on the server')) return null
  return entry.split(' (')[0]?.trim() ?? null
}

/** Only names the form itself writes; nothing with a slash or dots to climb. */
export function isPhotoFileName(name: string, reference: string): boolean {
  if (!name.startsWith(`${reference}-`)) return false
  return /^product\d{1,2}-photos-\d{1,2}\.(jpg|png|webp)$/.test(name.slice(reference.length + 1))
}

export function isProductFileName(name: string, reference: string): boolean {
  if (!name.startsWith(`${reference}-`)) return false
  return /^product\d{1,2}-productFiles-\d\.(pdf|xlsx|xls)$/.test(name.slice(reference.length + 1))
}

export function orderProducts(details: unknown, reference: string): OrderProduct[] {
  if (!details || typeof details !== 'object') return []
  const answers = details as Record<string, unknown>
  const items = Array.isArray(answers.products)
    ? (answers.products as unknown[]).filter(
        (item): item is Record<string, unknown> => !!item && typeof item === 'object',
      )
    : text(answers.productName)
      ? [answers]
      : []

  return items.map((item, index) => ({
    position: index + 1,
    productName: text(item.productName) ?? `Product ${index + 1}`,
    productLink: text(item.productLink),
    quantity: number(item.quantity),
    unit: text(item.unit),
    targetPrice: number(item.targetPrice),
    priceCurrency: text(item.priceCurrency),
    sizes: text(item.sizes),
    colours: text(item.colours),
    specs: text(item.specs),
    photos: (Array.isArray(item.photos) ? item.photos : [])
      .map((entry) => photoFileName(entry, reference))
      .filter((name): name is string => name !== null),
    files: (Array.isArray(item.productFiles) ? item.productFiles : [])
      .map((entry) => productFileName(entry, reference))
      .filter((name): name is string => name !== null),
  }))
}

/**
 * The first draft of the price lines: one per product, with what the client
 * asked for. The team then fills in the unit prices, and may change the
 * quantity or wording once the factory has answered.
 */
export function draftItems(products: readonly OrderProduct[]): OrderItem[] {
  return products.map((product) => ({
    position: product.position,
    productName: product.productName.slice(0, 160),
    description:
      [
        product.sizes && `Sizes: ${product.sizes}`,
        product.colours && `Colours: ${product.colours}`,
        product.specs,
      ]
        .filter(Boolean)
        .join('\n') || null,
    quantity: product.quantity,
    unit: (ORDER_UNITS as readonly string[]).includes(product.unit ?? '') ? product.unit : 'pieces',
    unitPrice: null,
  }))
}

/** Quantity × unit price, to the cent. Null while a line has no price. */
export function lineTotal(item: Pick<OrderItem, 'quantity' | 'unitPrice'>): number | null {
  if (item.quantity == null || item.unitPrice == null) return null
  return Math.round(item.quantity * item.unitPrice * 100) / 100
}

/** The order's total, or null until every line has a quantity and a price. */
export function orderTotal(items: readonly OrderItem[]): number | null {
  if (items.length === 0) return null
  let cents = 0
  for (const item of items) {
    const total = lineTotal(item)
    if (total === null) return null
    cents += Math.round(total * 100)
  }
  return cents / 100
}

/** The month folders a request's files can be in: its own and the one before. */
export function documentMonths(createdAt: string): string[] {
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return []
  const month = createdAt.slice(0, 7)
  const before = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth() - 1, 1))
  return [month, before.toISOString().slice(0, 7)]
}
