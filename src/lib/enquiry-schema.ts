import { z } from 'zod'

/**
 * Validation for the enquiry form, shared by the client (for instant feedback)
 * and the server action (which is the one that counts — the client-side pass is
 * a convenience and is never trusted).
 *
 * Error messages are message-catalogue keys rather than text, so the same
 * schema produces Arabic errors on the Arabic form and English on the English
 * one without a second schema.
 */

const E164 = /^\+?[1-9]\d{6,15}$/

export const enquirySchema = z.object({
  name: z.string().trim().min(2, 'nameRequired').max(120, 'nameTooLong'),
  country: z.string().trim().min(2, 'countryRequired').max(60, 'countryRequired'),
  whatsapp: z
    .string()
    .trim()
    .min(1, 'whatsappRequired')
    .transform((value) => value.replace(/[\s()-]/g, ''))
    .refine((value) => E164.test(value), 'whatsappInvalid'),
  email: z.string().trim().email().optional().or(z.literal('')),
  service: z.string().trim().optional().or(z.literal('')),
  message: z.string().trim().min(10, 'messageTooShort').max(4000, 'messageTooLong'),
})

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

/** Normalise to E.164 with a leading plus, which is what wa.me expects. */
export function toE164(value: string): string {
  const digits = value.replace(/[^\d]/g, '')
  return `+${digits}`
}
