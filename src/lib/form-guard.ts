import { createHmac, timingSafeEqual } from 'node:crypto'

import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from './form-fields.ts'

/**
 * Bot defences for the enquiry form. No third-party CAPTCHA: this audience is
 * on mid-range Androids over slow 4G in the Gulf and Yemen, and a CAPTCHA costs
 * them a 500 KB download, a privacy exposure and — for anyone with a visual
 * impairment — the form entirely. Three cheap server-side checks instead.
 *
 *   1. Honeypot — a field a human never sees and never fills.
 *   2. Timing   — a signed timestamp issued when the form renders. A submission
 *                 faster than a person can type is refused, and one older than
 *                 the window is refused too, so a token cannot be harvested and
 *                 replayed for days.
 *   3. Rate limit — src/lib/rate-limit.ts, per network prefix.
 */

/** A human cannot fill in five fields in under this. */
export const MIN_FILL_MS = 3_000
/** After this the token is stale; the form re-renders with a fresh one. */
export const MAX_FORM_AGE_MS = 2 * 60 * 60 * 1000

// The field names live in src/lib/form-fields.ts and are NOT re-exported here.
// This module reaches for node:crypto, so anything that imports it drags that
// into the bundle — which is exactly what the client form must not do.

function secret(): string {
  const value = process.env.PAYLOAD_SECRET
  if (!value) throw new Error('PAYLOAD_SECRET is required to sign form tokens.')
  return value
}

/** Issued when the form is rendered; verified when it comes back. */
export function issueFormToken(now = Date.now()): string {
  const payload = String(now)
  return `${payload}.${sign(payload)}`
}

export type FormGuardVerdict =
  | { ok: true }
  | { ok: false; reason: 'honeypot' | 'too-fast' | 'stale' | 'bad-token' }

export function verifyFormToken(
  token: unknown,
  honeypot: unknown,
  now = Date.now(),
): FormGuardVerdict {
  // A filled honeypot is an automated submission, full stop.
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return { ok: false, reason: 'honeypot' }
  }

  if (typeof token !== 'string') return { ok: false, reason: 'bad-token' }
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return { ok: false, reason: 'bad-token' }

  const expected = sign(payload)
  const given = Buffer.from(signature, 'hex')
  const want = Buffer.from(expected, 'hex')
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return { ok: false, reason: 'bad-token' }
  }

  const issuedAt = Number(payload)
  if (!Number.isFinite(issuedAt)) return { ok: false, reason: 'bad-token' }

  const age = now - issuedAt
  // A token from the future means a forged or clock-skewed payload.
  if (age < 0) return { ok: false, reason: 'bad-token' }
  if (age < MIN_FILL_MS) return { ok: false, reason: 'too-fast' }
  if (age > MAX_FORM_AGE_MS) return { ok: false, reason: 'stale' }

  return { ok: true }
}

export type FormGuardOutcome =
  /** Pass: store the submission. */
  | { drop: false; errorKey?: undefined }
  /** A bot: answer with a fake success and store nothing. */
  | { drop: true; errorKey?: undefined }
  /** Tell the visitor to try again (too fast, stale page, bad token). */
  | { drop: false; errorKey: 'tooFast' | 'generic' }

/**
 * What a form action does with a submission, and a log line for every
 * refusal, so a client who says "the site told me it arrived" can be traced.
 *
 * A filled honeypot alone no longer drops a submission. Browsers and password
 * managers autofill hidden fields, and on 11 October 2026 that cost a real
 * company-registration client their application: they saw a success page,
 * and nothing was stored or emailed. So the honeypot only drops a submission
 * whose timing token is ALSO forged or too fast; one with a valid token (the form was
 * rendered by our page and filled at human speed) is kept and logged.
 */
export function checkFormGuard(
  form: string,
  data: { get(name: string): unknown },
  now = Date.now(),
): FormGuardOutcome {
  const token = data.get(TIMESTAMP_FIELD)
  const honeypot = data.get(HONEYPOT_FIELD)
  const verdict = verifyFormToken(token, honeypot, now)
  if (verdict.ok) return { drop: false }

  if (verdict.reason === 'honeypot') {
    const tokenOnly = verifyFormToken(token, '', now)
    if (tokenOnly.ok) {
      console.warn(`[${form}] hidden field was filled but the token is valid — kept`)
      return { drop: false }
    }
    // A page left open for hours is a person, not a bot: ask them to resend.
    if (tokenOnly.reason === 'stale') {
      console.warn(`[${form}] refused: stale (hidden field also filled)`)
      return { drop: false, errorKey: 'generic' }
    }
    console.warn(`[${form}] dropped as a bot: hidden field filled and token ${tokenOnly.reason}`)
    return { drop: true }
  }

  console.warn(`[${form}] refused: ${verdict.reason}`)
  return { drop: false, errorKey: verdict.reason === 'too-fast' ? 'tooFast' : 'generic' }
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}
