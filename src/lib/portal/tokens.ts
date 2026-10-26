import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

/**
 * The portal's secrets, as pure functions of a server secret so they can be
 * tested. Nothing here touches the database or the request.
 *
 * Why a signed cookie of our own rather than Payload's auth on `customers`:
 * clients sign in without a password (a code by email, or a one-time link the
 * team sends on WhatsApp), and Payload's local strategy is built around one.
 * Keeping the portal's session apart also means a client's cookie can never
 * be mistaken for a staff session by the admin panel or the REST API.
 */

/** How long a client stays signed in. */
export const SESSION_DAYS = 14
/** A code sent by email is good for this long. */
export const CODE_MINUTES = 10
/** Wrong guesses allowed on one code before it is thrown away. */
export const CODE_MAX_ATTEMPTS = 5
/** A WhatsApp sign-in link is good for this long, and once. */
export const LINK_HOURS = 24

export type Session = {
  /** The customer's id. */
  c: number
  /** The customer's sessionVersion when the cookie was made; a bump signs them out everywhere. */
  v: number
  /** Expiry, in ms since the epoch. */
  e: number
}

function key(secret: string, purpose: string): Buffer {
  return createHash('sha256').update(`hgp-portal:${purpose}:${secret}`).digest()
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function signSession(session: Session, secret: string): string {
  const body = Buffer.from(JSON.stringify(session)).toString('base64url')
  const mac = createHmac('sha256', key(secret, 'session')).update(body).digest('base64url')
  return `${body}.${mac}`
}

/** The session in a cookie, or null when it is forged, malformed or expired. */
export function readSession(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): Session | null {
  if (!value || !secret) return null
  const [body, mac, extra] = value.split('.')
  if (!body || !mac || extra !== undefined) return null
  const expected = createHmac('sha256', key(secret, 'session')).update(body).digest('base64url')
  if (!equal(mac, expected)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session
    if (
      !Number.isInteger(parsed.c) ||
      !Number.isInteger(parsed.v) ||
      typeof parsed.e !== 'number' ||
      parsed.e <= now
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Six digits, leading zeros allowed. */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** The code is stored only as this hash, bound to the customer it was sent to. */
export function hashCode(customerId: number, code: string, secret: string): string {
  return createHmac('sha256', key(secret, 'code')).update(`${customerId}:${code}`).digest('hex')
}

export function codeMatches(
  customerId: number,
  code: string,
  storedHash: string,
  secret: string,
): boolean {
  return equal(hashCode(customerId, code, secret), storedHash)
}

/** Digits only, from whatever the client typed or pasted ("١٢٣ ٤٥٦" included). */
export function cleanCode(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '')
}

export function newLinkToken(): string {
  return randomBytes(32).toString('base64url')
}

/** A link token is stored only as this hash, so a database read cannot sign anyone in. */
export function hashLinkToken(token: string, secret: string): string {
  return createHmac('sha256', key(secret, 'link')).update(token).digest('hex')
}
