import { z } from 'zod'

import { whatsappNumber } from './phone.ts'

/**
 * Validation for the enquiry form, shared by the client (for instant feedback)
 * and the server action (which is the one that counts — the client-side pass is
 * a convenience and is never trusted).
 *
 * Error messages are message-catalogue keys rather than text, so the same
 * schema produces Arabic errors on the Arabic form and English on the English
 * one without a second schema.
 */

/** What the preprocess step produces for a usable number: a plus and 8–15 digits. */
const E164 = /^\+[1-9]\d{7,14}$/

export const enquirySchema = z.preprocess(
  // The number box and the country-code box in front of it become one
  // +<code><number> before the fields are checked. A number that cannot be
  // one keeps what was typed, marked so the check below rejects it.
  (input) => {
    if (!input || typeof input !== 'object') return input
    const { whatsapp, whatsappCode, ...rest } = input as Record<string, unknown>
    const typed = typeof whatsapp === 'string' ? whatsapp.trim() : ''
    if (!typed) return { ...rest, whatsapp: '' }
    const code = typeof whatsappCode === 'string' ? whatsappCode : null
    return { ...rest, whatsapp: whatsappNumber(code, typed) ?? `?${typed}` }
  },
  z.object({
    name: z.string().trim().min(2, 'nameRequired').max(120, 'nameTooLong'),
    country: z.string().trim().min(2, 'countryRequired').max(60, 'countryRequired'),
    whatsapp: z
      .string()
      .min(1, 'whatsappRequired')
      .refine((value) => E164.test(value), 'whatsappInvalid'),
    email: z.string().trim().email().optional().or(z.literal('')),
    service: z.string().trim().optional().or(z.literal('')),
    message: z.string().trim().min(10, 'messageTooShort').max(4000, 'messageTooLong'),
  }),
)

export type EnquiryInput = z.infer<typeof enquirySchema>

export type EnquiryFieldError = {
  field: keyof EnquiryInput
  key: string
}

export function collectErrors(error: z.ZodError): EnquiryFieldError[] {
  return error.issues.map((issue) => ({
    field: (issue.path[0] ?? 'message') as keyof EnquiryInput,
    key: issue.message,
  }))
}
