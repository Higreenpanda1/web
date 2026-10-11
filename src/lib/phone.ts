import { dialCountry } from './dial-codes.ts'

/**
 * Phone keyboards in Arabic and Persian type ١٣٨ or ۱۳۸, and Chinese ones can
 * type full-width １３８; read them all as 138.
 */
export function asciiDigits(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[０-９]/g, (d) => String(d.charCodeAt(0) - 0xff10))
    .replace(/＋/g, '+')
}

/** A full international number: country code and number, 8 to 15 digits. */
const INTERNATIONAL = /^[1-9]\d{7,14}$/
/** The old single-box rule, for a page loaded before the code box existed. */
const E164 = /^\+?[1-9]\d{6,15}$/

/**
 * A WhatsApp number as +<country code><number>, the form wa.me needs for the
 * reply button in the notification email, or null when it cannot be one.
 *
 * `countryCode` is the ISO code chosen in the country-code box (SA, YE…). The
 * number is what the visitor typed after it, usually the local number with
 * its leading 0. A number typed in full with + or 00 is taken as it is,
 * whatever the box says; so is one that already starts with the chosen code,
 * so 966501234567 under Saudi Arabia does not become +966966….
 */
export function whatsappNumber(countryCode: string | null | undefined, raw: string): string | null {
  const typed = asciiDigits(raw)
    .trim()
    .replace(/[\s().-]/g, '')
  if (!typed) return null

  const international = typed.startsWith('+')
    ? typed.slice(1)
    : typed.startsWith('00')
      ? typed.slice(2)
      : null
  if (international !== null) {
    return INTERNATIONAL.test(international) ? `+${international}` : null
  }
  if (!/^\d+$/.test(typed)) return null

  const country = dialCountry(countryCode)
  if (!country) return E164.test(typed) ? `+${typed}` : null

  const national = typed.replace(/^0+/, '')
  const full =
    national.startsWith(country.dial) && national.length - country.dial.length >= 7
      ? national
      : `${country.dial}${national}`
  return INTERNATIONAL.test(full) ? `+${full}` : null
}

/** The form field holding the country-code box's choice, next to a phone field. */
export function codeFieldName(phoneField: string): string {
  return `${phoneField}Code`
}
