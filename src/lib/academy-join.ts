import { DIAL_COUNTRIES } from './dial-codes.ts'
import { whatsappNumber } from './phone.ts'

/**
 * The course page's join form (/academy): a name, a WhatsApp number, which
 * side of the table they sit on, and a plan. It arrives as an enquiry like any
 * other, so the team sees it in the same list and the same email; this turns
 * the four fields into one.
 */

export const ACADEMY_SEATS = {
  imp: { ar: 'أستورد من الصين', en: 'I import from China' },
  exp: { ar: 'أصدّر من الصين', en: 'I export from China' },
  both: { ar: 'الاثنان', en: 'Both' },
} as const

export const ACADEMY_PLANS = {
  master: { ar: 'ماستر · 1,500 يوان', en: 'Master · 1,500 RMB' },
  premium: { ar: 'بريميوم · 2,900 يوان', en: 'Premium · 2,900 RMB' },
} as const

export type AcademyJoin = {
  name: string
  whatsapp: string
  country: string
  message: string
}

type Field = { get(name: string): unknown }

function text(data: Field, name: string): string {
  const value = data.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The country a full international number belongs to, by its longest
 * matching calling code. The form has no country box; the enquiry needs one,
 * and the number already says it.
 */
export function countryOfNumber(e164: string, locale: 'ar' | 'en'): string | null {
  const digits = e164.replace(/^\+/, '')
  let best: (typeof DIAL_COUNTRIES)[number] | null = null
  for (const country of DIAL_COUNTRIES) {
    if (digits.startsWith(country.dial) && country.dial.length > (best?.dial.length ?? 0)) {
      best = country
    }
  }
  return best ? best[locale] : null
}

/** The enquiry for one join request, or null when the name or number is unusable. */
export function academyJoin(data: Field, locale: 'ar' | 'en' | 'zh'): AcademyJoin | null {
  const name = text(data, 'n')
  const whatsapp = whatsappNumber(null, text(data, 'p'))
  if (name.length < 2 || name.length > 120 || !whatsapp) return null

  const seat = ACADEMY_SEATS[text(data, 's') as keyof typeof ACADEMY_SEATS] ?? ACADEMY_SEATS.imp
  const plan = ACADEMY_PLANS[text(data, 't') as keyof typeof ACADEMY_PLANS] ?? ACADEMY_PLANS.master

  // Written in Arabic whichever page it came from: the team reads Arabic.
  const message = [
    'طلب انضمام لكورس «التجارة الدولية من الألف إلى الياء»',
    `المكان على الطاولة: ${seat.ar}`,
    `الاشتراك: ${plan.ar}`,
    `من الصفحة: ${{ ar: 'العربية', en: 'الإنجليزية', zh: 'الصينية' }[locale]}`,
  ].join('\n')

  return {
    name,
    whatsapp,
    country: countryOfNumber(whatsapp, 'ar') ?? 'غير معروف',
    message,
  }
}
