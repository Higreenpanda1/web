import { createHmac, timingSafeEqual } from 'node:crypto'

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

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}
