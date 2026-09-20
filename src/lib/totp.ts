import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

/**
 * RFC 6238 TOTP, implemented on Node's crypto rather than pulled in as a
 * dependency. The whole algorithm is forty lines; the point of the rebuild was
 * to stop depending on a supply chain nobody audits, and an auth primitive is
 * the worst place to make an exception.
 */

const PERIOD_SECONDS = 30
const DIGITS = 6
/** How many 30-second windows either side of now are accepted, to tolerate
 *  clock drift between the server and the phone. One window = ±30s. */
const DRIFT_WINDOWS = 1

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateSecret(byteLength = 20): string {
  return base32Encode(randomBytes(byteLength))
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const digits = Array.from({ length: 10 }, () => randomInt(0, 10)).join('')
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  })
}

/** The otpauth:// URI an authenticator app scans. */
export function otpauthUrl(secret: string, account: string, issuer = 'HiGreenPanda'): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  })
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?${params}`
}

export function generateToken(secret: string, atMs: number = Date.now()): string {
  return hotp(base32Decode(secret), Math.floor(atMs / 1000 / PERIOD_SECONDS))
}

/**
 * Constant-time verification across the accepted drift window. Returns false
 * for any malformed input rather than throwing, so a bad token can never be
 * told apart from a wrong one by timing or by error text.
 */
export function verifyToken(token: string, secret: string, atMs: number = Date.now()): boolean {
  const cleaned = token.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(cleaned)) return false

  let key: Buffer
  try {
    key = base32Decode(secret)
  } catch {
    return false
  }
  if (key.length === 0) return false

  const counter = Math.floor(atMs / 1000 / PERIOD_SECONDS)
  let matched = false
  // Every window is evaluated even after a match so the loop takes the same
  // time whichever window the code belongs to.
  for (let offset = -DRIFT_WINDOWS; offset <= DRIFT_WINDOWS; offset += 1) {
    if (constantTimeEquals(hotp(key, counter + offset), cleaned)) matched = true
  }
  return matched
}

export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) {
    // Still do the comparison so length does not leak through timing.
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(Math.max(0, counter)))
  const digest = createHmac('sha1', key).update(buf).digest()
  const offset = digest[digest.length - 1]! & 0x0f
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff)
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

export function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) throw new Error('Invalid base32 character in TOTP secret')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}
