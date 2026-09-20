/**
 * Field names shared by the client form and the server guard.
 *
 * They live in their own module because src/lib/form-guard.ts imports
 * node:crypto to sign and verify the timing token, and the client bundle must
 * never pull that in. Constants here, crypto there.
 */
export const HONEYPOT_FIELD = 'company_website'
export const TIMESTAMP_FIELD = 'form_token'
