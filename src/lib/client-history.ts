import { billLines, billSums, type BillingItem } from './billing.ts'
import { orderProducts, orderTotal, type OrderItem } from './product-order.ts'

/**
 * A client's history with us, for the letter their bank asks for when they
 * send a transfer: proof that they ordered from us before and that we are in
 * touch. Banks in the Gulf often hold a payment to China until they see it.
 *
 * Only requests in the site's own records count, matched by WhatsApp number.
 * The owner decided on 26 Oct 2026 that older orders taken on WhatsApp stay
 * out ("old orders are old"), so there is nothing to type in by hand.
 *
 * Kept free of Payload and Next imports so the unit tests can load it.
 */

/** The fields of an application the history reads. */
export type HistorySource = {
  id: number | string
  reference: string
  type: string
  status?: string | null
  whatsapp: string
  createdAt: string
  details?: unknown
  order?: {
    currency?: string | null
    items?: OrderItem[] | null
    total?: number | null
  } | null
  billing?: { items?: BillingItem[] | null } | null
}

export type Bilingual = { en: string; ar: string }

export type HistoryRow = {
  id: number | string
  reference: string
  /** YYYY-MM-DD. */
  date: string
  what: Bilingual
  /** Product names, for goods, as the client typed them. */
  products: string[]
  /** "USD 1,250" or null when no price is set yet. */
  amount: string | null
  status: Bilingual
}

/** Goods are bought from Nasher; everything else is a HiGP service. */
export const isGoods = (type: string) => type === 'product-search' || type === 'shipping-quote'

const WHAT: Record<string, Bilingual> = {
  consultation: { en: 'Consultation', ar: 'استشارة' },
  'company-registration': { en: 'Company registration in China', ar: 'تأسيس شركة في الصين' },
  'visa-invitation': { en: 'Business invitation letter', ar: 'خطاب دعوة تجارية' },
  visa: { en: 'Visa', ar: 'تأشيرة' },
  'product-search': { en: 'Purchase of goods', ar: 'شراء بضائع' },
  'shipping-quote': { en: 'Shipping of goods', ar: 'شحن بضائع' },
  'account-opening': { en: 'Bank account opening', ar: 'فتح حساب بنكي' },
  'store-setup': { en: 'Online store setup', ar: 'إنشاء متجر إلكتروني' },
  trademark: { en: 'Trademark registration', ar: 'تسجيل علامة تجارية' },
}

/**
 * What a bank should read for each status. A request still being discussed
 * is an enquiry; "lost" is shown the same way, since it is still contact.
 */
const STATUS: Record<string, Bilingual> = {
  'in-progress': { en: 'In progress', ar: 'قيد التنفيذ' },
  completed: { en: 'Completed', ar: 'مكتمل' },
}
const ENQUIRY: Bilingual = { en: 'Enquiry', ar: 'استفسار' }

/** Digits only, so "+966 50 123 4567" and "+966501234567" are the same client. */
export function sameNumber(a: string, b: string): boolean {
  const digits = (value: string) => value.replace(/\D/g, '')
  return digits(a) !== '' && digits(a) === digits(b)
}

export function formatMoney(currency: string, amount: number): string {
  const whole = Number.isInteger(amount)
  return `${currency.toUpperCase()} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

/** The value of one request: the product order's total, or the services' total in yuan. */
export function requestAmount(source: HistorySource): string | null {
  if (source.type === 'product-search') {
    const items = source.order?.items ?? []
    const total = source.order?.total ?? (items.length ? orderTotal(items) : null)
    if (!total) return null
    return formatMoney(source.order?.currency || 'usd', total)
  }
  const lines = billLines(source.billing?.items ?? [])
  if (lines.length === 0) return null
  return formatMoney('cny', billSums(lines).total)
}

function productNames(source: HistorySource): string[] {
  const fromOrder = (source.order?.items ?? [])
    .map((item) => item.productName?.trim())
    .filter((name): name is string => Boolean(name))
  if (fromOrder.length) return fromOrder
  return orderProducts(source.details, source.reference).map((product) => product.productName)
}

/**
 * The client's requests, oldest first, from everything with the same
 * WhatsApp number. Spam is never shown.
 */
export function clientHistory(current: HistorySource, all: readonly HistorySource[]): HistoryRow[] {
  return all
    .filter((source) => sameNumber(source.whatsapp, current.whatsapp))
    .filter((source) => source.status !== 'spam')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((source) => ({
      id: source.id,
      reference: source.reference,
      date: source.createdAt.slice(0, 10),
      what: WHAT[source.type] ?? { en: source.type, ar: source.type },
      products: source.type === 'product-search' ? productNames(source) : [],
      amount: requestAmount(source),
      status: STATUS[source.status ?? ''] ?? ENQUIRY,
    }))
}
