import { priceListItem } from './price-list.ts'

/**
 * The sums behind a HiGP quote and its invoices.
 *
 * The owner's payment terms (26 Oct 2026), printed on every quote:
 *
 *   - pay 50% now and the balance when the service is completed, or
 *   - pay everything now and get 3.5% off;
 *   - pass-through lines (the registered address is rent paid on to the
 *     landlord) are paid in full with the first payment, never split and
 *     never discounted, because the money is not ours.
 *
 * Kept free of Payload and Next imports so the unit tests can load it.
 */

export const FULL_PAYMENT_DISCOUNT = 0.035
export const QUOTE_VALID_DAYS = 14
export const INVOICE_DUE_DAYS = 7

/** Which invoice: the 50% deposit, the balance, or the whole amount paid at once. */
export const INVOICE_STAGES = ['deposit', 'balance', 'full'] as const
export type InvoiceStage = (typeof INVOICE_STAGES)[number]

/** A line as the `billing.items` array stores it. */
export type BillingItem = {
  /** A price-list SKU, or 'other' for a line typed by hand. */
  service?: string | null
  name?: string | null
  nameZh?: string | null
  description?: string | null
  quantity?: number | null
  unitPrice?: number | null
}

/** A line ready to print. */
export type BillLine = {
  en: string
  zh: string | null
  description: string | null
  quantity: number
  unitPrice: number
  amount: number
  yearly: boolean
  passThrough: boolean
}

const cents = (value: number) => Math.round(value * 100)
const yuan = (value: number) => value / 100

/**
 * Lines from the stored items: a price-list service takes its names and flags
 * from the list, and its price too unless the team typed another (a special
 * client). Lines with no name are left out.
 */
export function billLines(items: readonly BillingItem[]): BillLine[] {
  return items.flatMap((item) => {
    const listed = priceListItem(item.service)
    const en = item.name?.trim() || listed?.en
    if (!en) return []
    const quantity = item.quantity ?? 1
    const unitPrice = item.unitPrice ?? listed?.price ?? 0
    return [
      {
        en,
        zh: item.nameZh?.trim() || (item.name?.trim() ? null : (listed?.zh ?? null)),
        description: item.description?.trim() || null,
        quantity,
        unitPrice,
        amount: yuan(cents(quantity * unitPrice)),
        yearly: listed?.yearly ?? false,
        passThrough: listed?.passThrough ?? false,
      },
    ]
  })
}

export type BillSums = {
  total: number
  /** Not ours: paid in full with the first payment. */
  passThrough: number
  /** Our fees: split 50/50, or discounted when paid at once. */
  fees: number
  deposit: number
  balance: number
  discount: number
  full: number
}

export function billSums(lines: readonly BillLine[]): BillSums {
  const passThrough = lines.filter((l) => l.passThrough).reduce((s, l) => s + cents(l.amount), 0)
  const fees = lines.filter((l) => !l.passThrough).reduce((s, l) => s + cents(l.amount), 0)
  const half = Math.round(fees / 2)
  const discount = Math.round(fees * FULL_PAYMENT_DISCOUNT)
  return {
    total: yuan(passThrough + fees),
    passThrough: yuan(passThrough),
    fees: yuan(fees),
    deposit: yuan(passThrough + half),
    balance: yuan(fees - half),
    discount: yuan(discount),
    full: yuan(passThrough + fees - discount),
  }
}

export function amountDue(sums: BillSums, stage: InvoiceStage): number {
  return sums[stage]
}

/** Q-<reference> for the quote; INV-<reference>-D/B/F for its invoices. */
export function documentNumber(reference: string, kind: 'quote' | InvoiceStage): string {
  if (kind === 'quote') return `Q-${reference}`
  return `INV-${reference}-${{ deposit: 'D', balance: 'B', full: 'F' }[kind]}`
}

/** YYYY-MM-DD, `days` after the given YYYY-MM-DD. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
