/**
 * Field names shared by the client form and the server guard.
 *
 * They live in their own module because src/lib/form-guard.ts imports
 * node:crypto to sign and verify the timing token, and the client bundle must
 * never pull that in. Constants here, crypto there.
 */
// Deliberately meaningless. It used to be "company_website", which browsers
// and password managers autofill on a company-registration form, so a real
// client was taken for a bot and their application silently dropped.
export const HONEYPOT_FIELD = 'hgp_extra'
export const TIMESTAMP_FIELD = 'form_token'
