import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Backup codes are stored as scrypt hashes, never in clear. They are only ten
 * digits, so a fast hash would be brute-forceable offline if the database ever
 * leaked — which is exactly the scenario a second factor exists for.
 */

const KEY_LENGTH = 32
const SCRYPT_COST = 16384

export function hashBackupCode(code: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(normalise(code), salt, KEY_LENGTH, { N: SCRYPT_COST })
  return `scrypt$${SCRYPT_COST}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export function verifyBackupCode(code: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false
  const cost = Number(parts[1])
  if (!Number.isInteger(cost) || cost < 1024) return false

  try {
    const salt = Buffer.from(parts[2]!, 'base64')
    const expected = Buffer.from(parts[3]!, 'base64')
    const derived = scryptSync(normalise(code), salt, expected.length, { N: cost })
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

function normalise(code: string): string {
  return code.replace(/[\s-]/g, '')
}
