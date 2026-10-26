import { cookies } from 'next/headers'

import { email as emailConfig } from '@/lib/env'
import { getPayloadClient } from '@/lib/payload'
import { absoluteUrl } from '@/lib/url'
import {
  CODE_MAX_ATTEMPTS,
  CODE_MINUTES,
  LINK_HOURS,
  SESSION_DAYS,
  codeMatches,
  hashCode,
  hashLinkToken,
  newCode,
  newLinkToken,
  readSession,
  signSession,
} from './tokens'

import type { Customer } from '@/payload-types'
import type { Payload } from 'payload'

/**
 * Signing clients in and out of the portal. The pure parts (signing, hashing)
 * are in ./tokens.ts; this file is the database and the cookie.
 *
 * Every lookup here uses the local API with access control bypassed, because
 * the client has no Payload session; what they may see is decided by
 * ./requests.ts from the account the cookie names, never by anything they send.
 */

export const SESSION_COOKIE = 'hgp_portal'

function secret(): string {
  const value = process.env.PAYLOAD_SECRET
  if (!value) throw new Error('PAYLOAD_SECRET is not set; the portal cannot sign sessions.')
  return value
}

async function findOne(payload: Payload, where: Record<string, unknown>) {
  const { docs } = await payload.find({
    collection: 'customers',
    where: where as never,
    limit: 1,
    depth: 0,
    showHiddenFields: true,
  })
  return docs[0] ?? null
}

/** The signed-in client, or null. Re-checked against the database on every request. */
export async function currentCustomer(): Promise<Customer | null> {
  const jar = await cookies()
  const session = readSession(jar.get(SESSION_COOKIE)?.value, process.env.PAYLOAD_SECRET ?? '')
  if (!session) return null
  const payload = await getPayloadClient()
  const customer = await payload
    .findByID({ collection: 'customers', id: session.c, depth: 0, showHiddenFields: true })
    .catch(() => null)
  if (!customer || customer.disabled || (customer.sessionVersion ?? 0) !== session.v) return null
  return customer
}

async function startSession(payload: Payload, customer: Customer) {
  const expires = Date.now() + SESSION_DAYS * 86_400_000
  const jar = await cookies()
  jar.set(
    SESSION_COOKIE,
    signSession({ c: customer.id, v: customer.sessionVersion ?? 0, e: expires }, secret()),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(expires),
    },
  )
  await payload.update({
    collection: 'customers',
    id: customer.id,
    data: { lastLoginAt: new Date().toISOString() },
    depth: 0,
  })
}

export async function endSession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export type CodeText = { subject: string; body: string }

/**
 * Emails a sign-in code to an active account with this address. Says nothing
 * about whether there was one: the page reads the same either way, so the
 * form cannot be used to find out who our clients are.
 */
export async function sendLoginCode(
  address: string,
  text: (customer: Customer, code: string) => CodeText,
): Promise<void> {
  const payload = await getPayloadClient()
  const customer = await findOne(payload, {
    email: { equals: address.trim().toLowerCase() },
    disabled: { not_equals: true },
  })
  if (!customer) return

  const code = newCode()
  await payload.update({
    collection: 'customers',
    id: customer.id,
    data: {
      loginCodeHash: hashCode(customer.id, code, secret()),
      loginCodeExpiresAt: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
      loginCodeAttempts: 0,
    },
    depth: 0,
  })

  if (!emailConfig.configured || !customer.email) {
    console.warn(`[portal] sign-in code for customer ${customer.id} not sent: no email provider`)
    return
  }
  const { subject, body } = text(customer, code)
  const dir = customer.preferredLocale === 'en' ? 'ltr' : 'rtl'
  try {
    await payload.sendEmail({
      to: customer.email,
      replyTo: emailConfig.notifyTo[0],
      subject,
      text: body,
      html: `<!doctype html><html lang="${customer.preferredLocale ?? 'ar'}" dir="${dir}"><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.7">
<h2 style="color:#276B34;margin:0 0 16px">HiGreenPanda</h2>
<p>${escapeHtml(body)}</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:700;background:#F3FAF4;padding:14px;border-radius:8px;text-align:center;direction:ltr">${code}</p>
<p style="color:#4C574F"><a href="https://higreenpanda.com" style="color:#276B34">higreenpanda.com</a></p>
</body></html>`,
    })
  } catch (error) {
    console.error(`[portal] sign-in code for customer ${customer.id} failed to send`, error)
  }
}

export type CodeResult = 'ok' | 'wrong' | 'expired' | 'tooMany'

export async function signInWithCode(address: string, code: string): Promise<CodeResult> {
  const payload = await getPayloadClient()
  const customer = await findOne(payload, {
    email: { equals: address.trim().toLowerCase() },
    disabled: { not_equals: true },
  })
  // No account reads as a wrong code, for the same reason as above.
  if (!customer) return 'wrong'
  if (!customer.loginCodeHash || !customer.loginCodeExpiresAt) return 'expired'
  if (Date.parse(customer.loginCodeExpiresAt) <= Date.now()) return 'expired'
  if ((customer.loginCodeAttempts ?? 0) >= CODE_MAX_ATTEMPTS) return 'tooMany'

  if (!codeMatches(customer.id, code, customer.loginCodeHash, secret())) {
    const attempts = (customer.loginCodeAttempts ?? 0) + 1
    await payload.update({
      collection: 'customers',
      id: customer.id,
      // The last allowed guess throws the code away; a new one must be asked for.
      data:
        attempts >= CODE_MAX_ATTEMPTS
          ? { loginCodeAttempts: attempts, loginCodeHash: null }
          : { loginCodeAttempts: attempts },
      depth: 0,
    })
    return attempts >= CODE_MAX_ATTEMPTS ? 'tooMany' : 'wrong'
  }

  await payload.update({
    collection: 'customers',
    id: customer.id,
    data: { loginCodeHash: null, loginCodeExpiresAt: null, loginCodeAttempts: 0 },
    depth: 0,
  })
  await startSession(payload, customer)
  return 'ok'
}

/** Signs in with a WhatsApp link's token, once. False when used, expired or unknown. */
export async function signInWithLink(token: string): Promise<boolean> {
  if (!token || token.length < 40) return false
  const payload = await getPayloadClient()
  const customer = await findOne(payload, {
    loginLinkHash: { equals: hashLinkToken(token, secret()) },
    disabled: { not_equals: true },
  })
  if (!customer?.loginLinkExpiresAt || Date.parse(customer.loginLinkExpiresAt) <= Date.now()) {
    return false
  }
  await payload.update({
    collection: 'customers',
    id: customer.id,
    data: { loginLinkHash: null, loginLinkExpiresAt: null },
    depth: 0,
  })
  await startSession(payload, customer)
  return true
}

/**
 * The admin's "Copy WhatsApp sign-in link". A new link replaces any earlier
 * one. The page it opens asks the client to press "Sign in" before it is
 * used, because WhatsApp opens every link once itself to draw its preview.
 */
export async function createLoginLink(
  payload: Payload,
  id: number,
): Promise<{ ok: true; url: string; expiresAt: string } | { ok: false; error: string }> {
  const customer = await payload
    .findByID({ collection: 'customers', id, depth: 0 })
    .catch(() => null)
  if (!customer) return { ok: false, error: 'Account not found.' }
  if (customer.disabled) return { ok: false, error: 'This account is disabled.' }

  const token = newLinkToken()
  const expiresAt = new Date(Date.now() + LINK_HOURS * 3_600_000).toISOString()
  await payload.update({
    collection: 'customers',
    id,
    data: { loginLinkHash: hashLinkToken(token, secret()), loginLinkExpiresAt: expiresAt },
    depth: 0,
  })
  const locale = customer.preferredLocale === 'en' ? 'en' : 'ar'
  return { ok: true, url: `${absoluteUrl(locale, '/portal/link')}?t=${token}`, expiresAt }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
