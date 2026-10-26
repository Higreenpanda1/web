'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { isLocale, type Locale } from '@/i18n/routing'
import { getPayloadClient } from '@/lib/payload'
import {
  currentCustomer,
  endSession,
  sendLoginCode,
  signInWithCode,
  signInWithLink,
} from '@/lib/portal/accounts'
import { cleanCode } from '@/lib/portal/tokens'
import { consume, networkPrefix } from '@/lib/rate-limit'
import { localePath } from '@/lib/url'

/**
 * The portal's sign-in steps. Limits, per network and per address, so the
 * code cannot be guessed and the form cannot be used to flood an inbox:
 * the code itself also dies after five wrong tries (src/lib/portal/tokens.ts).
 */

const WINDOW_MS = 10 * 60_000
const SENDS_PER_ADDRESS = 3
const SENDS_PER_NETWORK = 10
const TRIES_PER_NETWORK = 20

export type LoginState =
  | { step: 'email'; error?: 'tooMany' | 'email' }
  | { step: 'code'; email: string; error?: 'wrong' | 'expired' | 'tooMany'; resent?: boolean }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function portalLocale(raw: FormDataEntryValue | null): Locale {
  const value = String(raw ?? '')
  return isLocale(value) && value !== 'zh' ? value : 'ar'
}

async function network(): Promise<string> {
  const list = await headers()
  return networkPrefix(list.get('x-real-ip') ?? list.get('x-forwarded-for'))
}

async function requestCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  if (!EMAIL.test(email) || email.length > 200) return { step: 'email', error: 'email' }

  const prefix = await network()
  if (
    !consume(`portal-send:${prefix}`, SENDS_PER_NETWORK, WINDOW_MS).allowed ||
    !consume(`portal-send:${email}`, SENDS_PER_ADDRESS, WINDOW_MS).allowed
  ) {
    return formData.get('resend')
      ? { step: 'code', email, error: 'tooMany' }
      : { step: 'email', error: 'tooMany' }
  }

  await sendLoginCode(email, (customer, code) => {
    // The email is in the client's own language, whatever page they used.
    const language = customer.preferredLocale === 'en' ? 'en' : 'ar'
    return codeText[language](customer.fullName, code)
  })
  return { step: 'code', email, resent: Boolean(formData.get('resend')) }
}

async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const code = cleanCode(String(formData.get('code') ?? ''))
  const locale = portalLocale(formData.get('locale'))

  if (!consume(`portal-try:${await network()}`, TRIES_PER_NETWORK, WINDOW_MS).allowed) {
    return { step: 'code', email, error: 'tooMany' }
  }
  if (code.length !== 6) return { step: 'code', email, error: 'wrong' }

  const result = await signInWithCode(email, code)
  if (result !== 'ok') return { step: 'code', email, error: result }
  redirect(localePath(locale, '/portal'))
}

/** The sign-in form: one action, so the page has one state to show. */
export async function portalLogin(prev: LoginState, formData: FormData): Promise<LoginState> {
  return formData.get('intent') === 'verify'
    ? verifyCode(prev, formData)
    : requestCode(prev, formData)
}

export async function signInFromLink(formData: FormData): Promise<void> {
  const locale = portalLocale(formData.get('locale'))
  const allowed = consume(`portal-try:${await network()}`, TRIES_PER_NETWORK, WINDOW_MS).allowed
  const ok = allowed && (await signInWithLink(String(formData.get('token') ?? '')))
  redirect(ok ? localePath(locale, '/portal') : `${localePath(locale, '/portal/link')}?error=1`)
}

export async function signOut(formData: FormData): Promise<void> {
  await endSession()
  redirect(localePath(portalLocale(formData.get('locale')), '/portal/login'))
}

/**
 * The sign-in code email, wording approved by the owner on 26 October 2026.
 * Here rather than in src/messages because it goes out in the account's
 * language, not the page's.
 */
const codeText: Record<
  'ar' | 'en',
  (name: string, code: string) => { subject: string; body: string }
> = {
  ar: (name, code) => ({
    subject: `رمز الدخول إلى بوابة HiGreenPanda: ${code}`,
    body: `مرحبا ${name}، رمز الدخول: ${code}. صالح 10 دقائق. إذا ما طلبته، تجاهل هذا الإيميل.`,
  }),
  en: (name, code) => ({
    subject: `Your HiGreenPanda sign-in code: ${code}`,
    body: `Hello ${name}, your sign-in code is ${code}. It is valid for 10 minutes. If you did not ask for it, ignore this email.`,
  }),
}

/** The account page's language. The page itself switches to it. */
export async function setPortalLanguage(_prev: boolean, formData: FormData): Promise<boolean> {
  const customer = await currentCustomer()
  if (!customer) redirect(localePath(portalLocale(formData.get('page')), '/portal/login'))
  const language = formData.get('language') === 'en' ? 'en' : 'ar'
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'customers',
    id: customer.id,
    data: { preferredLocale: language },
    depth: 0,
  })
  if (language !== portalLocale(formData.get('page'))) {
    redirect(localePath(language, '/portal/account'))
  }
  return true
}
