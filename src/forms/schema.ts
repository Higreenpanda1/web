import { asciiDigits, codeFieldName, whatsappNumber } from '../lib/phone.ts'
import { allFields, type FieldDef, type FormDef } from './definitions.ts'

export { asciiDigits }

/**
 * Validation for the application forms, derived from the definitions rather
 * than written by hand for each — so a field cannot be required on the page
 * and optional on the server, or the other way round.
 *
 * No zod here, deliberately. The rules are simple (present, within length,
 * one of the options, a valid date, a plausible phone number), the input is
 * always FormData, and a plain function keeps the module importable from the
 * client bundle for instant per-step feedback without dragging a schema
 * library into it. Error values are message-catalogue keys under
 * `apply.errors.*`, not text.
 */

export type ValidationResult =
  | { ok: true; details: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Reader = {
  get: (name: string) => string | null
  getAll: (name: string) => string[]
}

/** Adapts FormData or a plain object so tests do not need the DOM class. */
export function reader(source: FormData | Record<string, string | string[]>): Reader {
  if (typeof FormData !== 'undefined' && source instanceof FormData) {
    return {
      get: (name) => {
        const value = source.get(name)
        return typeof value === 'string' ? value : null
      },
      getAll: (name) => source.getAll(name).filter((v): v is string => typeof v === 'string'),
    }
  }
  const record = source as Record<string, string | string[]>
  return {
    get: (name) => {
      const value = record[name]
      if (Array.isArray(value)) return value[0] ?? null
      return typeof value === 'string' ? value : null
    },
    getAll: (name) => {
      const value = record[name]
      if (Array.isArray(value)) return value
      return typeof value === 'string' ? [value] : []
    },
  }
}

/** Is this field currently in play, given the other answers? */
export function isVisible(field: FieldDef, read: Reader): boolean {
  if (!field.showIf) return true
  const controller = read.get(field.showIf.field) ?? ''
  return field.showIf.in.includes(controller)
}

export function validateApplication(def: FormDef, source: Reader): ValidationResult {
  const details: Record<string, unknown> = {}
  const errors: Record<string, string> = {}

  for (const field of allFields(def)) {
    // A hidden field is neither required nor kept. The visitor never saw it.
    if (!isVisible(field, source)) continue
    // Files are not text; the action reads and checks them separately
    // (src/lib/documents.ts) and adds the result to the details.
    if (field.kind === 'file') continue

    const outcome = checkField(field, source)
    if (outcome.error) {
      errors[field.name] = outcome.error
    } else if (outcome.value !== undefined) {
      details[field.name] = outcome.value
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, details }
}

type Outcome = { value?: unknown; error?: string }

function checkField(field: FieldDef, read: Reader): Outcome {
  if (field.kind === 'checkboxes') {
    const chosen = read.getAll(field.name).map((v) => v.trim())
    const allowed = new Set(field.options ?? [])
    if (chosen.some((v) => !allowed.has(v))) return { error: 'invalid' }
    if (field.required && chosen.length === 0) return { error: 'required' }
    return chosen.length > 0 ? { value: chosen } : {}
  }

  const raw = (read.get(field.name) ?? '').trim()
  if (raw.length === 0) return field.required ? { error: 'required' } : {}

  const max = field.max ?? DEFAULT_MAX[field.kind]
  if (max !== undefined && raw.length > max && field.kind !== 'number') return { error: 'tooLong' }

  switch (field.kind) {
    case 'file':
      return {}
    case 'text':
    case 'textarea':
    case 'country':
      return { value: raw }
    case 'select':
      return field.options?.includes(raw) ? { value: raw } : { error: 'invalid' }
    case 'number': {
      const n = Number(raw.replace(/[,\s]/g, ''))
      if (!Number.isFinite(n)) return { error: 'number' }
      if (field.min !== undefined && n < field.min) return { error: 'number' }
      if (field.max !== undefined && n > field.max) return { error: 'number' }
      return { value: n }
    }
    case 'date': {
      if (!ISO_DATE.test(raw) || Number.isNaN(Date.parse(raw))) return { error: 'date' }
      return { value: raw }
    }
    case 'tel': {
      if (field.country === 'CN') {
        const mobile = chinaMobile(raw)
        return mobile ? { value: mobile } : { error: 'chinaPhone' }
      }
      const number = whatsappNumber(read.get(codeFieldName(field.name)), raw)
      return number ? { value: number } : { error: 'whatsapp' }
    }
    case 'email':
      return EMAIL.test(raw) ? { value: raw.toLowerCase() } : { error: 'email' }
    case 'url': {
      // Accept a bare domain as well as a full URL; buyers paste both.
      const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
      try {
        const url = new URL(candidate)
        if (!['http:', 'https:'].includes(url.protocol)) return { error: 'url' }
        return { value: url.toString() }
      } catch {
        return { error: 'url' }
      }
    }
  }
}

const DEFAULT_MAX: Partial<Record<FieldDef['kind'], number>> = {
  text: 200,
  textarea: 4000,
  country: 80,
  tel: 24,
  email: 254,
  url: 500,
  select: 60,
  date: 10,
}

/**
 * A mainland Chinese mobile number as +86 and 11 digits, from what a visitor
 * types: the bare 11 digits, or with +86, 86 or 0086 in front.
 */
export function chinaMobile(raw: string): string | null {
  const digits = asciiDigits(raw).replace(/[\s().+-]/g, '')
  const national = digits.replace(/^(0086|86)(?=1\d{10}$)/, '')
  return /^1[3-9]\d{9}$/.test(national) ? `+86${national}` : null
}
