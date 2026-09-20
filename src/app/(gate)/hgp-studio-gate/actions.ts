'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { findUnusedBackupCode } from '@/collections/Users'
import { getPayloadClient } from '@/lib/payload'
import { consume, networkPrefix, peek } from '@/lib/rate-limit'
import { verifyToken } from '@/lib/totp'

/**
 * The two-factor sign-in gate.
 *
 * Payload's admin has no second factor of its own, so rather than patch its
 * login form this replaces it: the `beforeLogin` hook on the Users collection
 * refuses every login that does not carry `twoFactorVerified` on the request
 * context, and this action is the only place that sets it. The consequence is
 * that POST /api/users/login is closed to a password-only attacker too, not
 * just the admin screen.
 *
 * Order matters here. The TOTP code is checked *before* the password, using a
 * direct database read, so a correct password with a wrong code never produces
 * a session at all.
 */

const TWO_FACTOR_COOKIE = 'hgp_2fa'
const GATE_ATTEMPTS = 8
const GATE_WINDOW_MS = 15 * 60 * 1000

export type GateState = { error?: string }

export async function signIn(_previous: GateState, formData: FormData): Promise<GateState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const code = String(formData.get('code') ?? '').trim()
  const next = sanitiseNext(String(formData.get('next') ?? ''))

  if (!email || !password) return { error: 'Enter your email address and password.' }

  const headerList = await headers()
  const prefix = networkPrefix(headerList.get('x-real-ip') ?? headerList.get('x-forwarded-for'))
  const limitKey = `gate:${prefix}`

  // Check the budget without spending it. Only a *failed* attempt is charged
  // (see `refuse` below) — an administrator signing in successfully several
  // times in an afternoon is not a brute-force attack, and charging for it
  // would lock them out of their own site.
  if (!peek(limitKey, GATE_ATTEMPTS).allowed) {
    return { error: 'Too many attempts. Wait fifteen minutes and try again.' }
  }

  /** Record a failure against the budget and return the same message always. */
  const refuse = (): GateState => {
    consume(limitKey, GATE_ATTEMPTS, GATE_WINDOW_MS)
    // Telling an attacker which of the three factors was wrong is telling them
    // which two were right.
    return { error: 'Those details are not correct.' }
  }

  const payload = await getPayloadClient()
  const required = process.env.ADMIN_REQUIRE_2FA === 'true'

  let consumedBackupCodeIndex = -1

  if (required) {
    if (!code) return { error: 'Enter the code from your authenticator app.' }

    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      // These fields are unreadable through the API by design; the local API
      // bypasses field access control, which is why this read works here and
      // nowhere else.
      showHiddenFields: true,
    })

    const user = found.docs[0]
    if (!user?.totpEnabled || !user.totpSecret) return refuse()

    const totpValid = verifyToken(code, user.totpSecret)
    if (!totpValid) {
      consumedBackupCodeIndex = findUnusedBackupCode(code, user.backupCodes)
      if (consumedBackupCodeIndex === -1) return refuse()
    }
  }

  let token: string | undefined
  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
      // The flag the beforeLogin hook looks for. Nothing else sets it.
      context: { twoFactorVerified: true },
      depth: 0,
    })
    token = result.token
  } catch {
    return refuse()
  }

  if (!token) return refuse()

  // Burn the backup code only once the password has also checked out, so a
  // wrong password cannot be used to exhaust someone's codes.
  if (consumedBackupCodeIndex >= 0) {
    await markBackupCodeUsed(email, consumedBackupCodeIndex)
  }

  const cookieStore = await cookies()
  const secure = process.env.NODE_ENV === 'production'

  cookieStore.set('payload-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  // Marks this browser as having passed the second factor. Middleware checks
  // only for its presence; the session itself is carried by payload-token, so
  // this cookie grants nothing on its own.
  cookieStore.set(TWO_FACTOR_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  redirect(next)
}

async function markBackupCodeUsed(email: string, index: number): Promise<void> {
  try {
    const payload = await getPayloadClient()
    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
    })
    const user = found.docs[0]
    if (!user?.backupCodes) return

    const codes = user.backupCodes.map((entry, position) =>
      position === index ? { ...entry, usedAt: new Date().toISOString() } : entry,
    )
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { backupCodes: codes },
      overrideAccess: true,
    })
  } catch (error) {
    console.error('[gate] could not mark backup code as used', error)
  }
}

/** Only ever redirect inside the admin panel; never to an attacker's URL. */
function sanitiseNext(value: string): string {
  if (!value.startsWith('/hgp-studio')) return '/hgp-studio'
  if (value.startsWith('//')) return '/hgp-studio'
  return value
}
