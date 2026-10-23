import { randomBytes } from 'node:crypto'

import { headers } from 'next/headers'

import { academyJoin } from '@/lib/academy-join'
import { sendEnquiryNotification } from '@/lib/email'
import { checkFormGuard } from '@/lib/form-guard'
import { getPayloadClient } from '@/lib/payload'
import { consume, networkPrefix } from '@/lib/rate-limit'

/**
 * POST /academy/join — the course page's join form.
 *
 * The page is plain HTML served by a route handler, so it cannot call the
 * site's enquiry server action; this is the same path in route form. Same bot
 * checks, same rate limit, same Enquiries collection and email, so a join
 * request reaches the team exactly where every other lead does. Stored first,
 * emailed second: an email failure never loses the lead.
 */
export const dynamic = 'force-dynamic'

const RATE_LIMIT = 5
const RATE_WINDOW_MS = 10 * 60 * 1000

type Result = { ok: true; reference: string } | { ok: false; error: 'invalid' | 'retry' }

function reply(result: Result, status = 200) {
  return Response.json(result, { status, headers: { 'Cache-Control': 'no-store' } })
}

function reference(): string {
  const now = new Date()
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
  return `HGP-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`
}

export async function POST(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  // The Chinese page is the Arabic route with ?lang=zh, as on /offices.
  const locale =
    raw === 'en' || raw === 'zh'
      ? raw
      : new URL(request.url).searchParams.get('lang') === 'zh'
        ? 'zh'
        : 'ar'
  const headerList = await headers()

  let data: FormData
  try {
    data = await request.formData()
  } catch {
    return reply({ ok: false, error: 'retry' }, 400)
  }

  const guard = checkFormGuard('academy', data)
  // A bot is told it worked and nothing is stored.
  if (guard.drop) return reply({ ok: true, reference: reference() })
  if (guard.errorKey) return reply({ ok: false, error: 'retry' })

  const prefix = networkPrefix(headerList.get('x-real-ip') ?? headerList.get('x-forwarded-for'))
  if (!consume(`enquiry:${prefix}`, RATE_LIMIT, RATE_WINDOW_MS).allowed) {
    return reply({ ok: false, error: 'retry' }, 429)
  }

  const join = academyJoin(data, locale)
  if (!join) return reply({ ok: false, error: 'invalid' })

  const payload = await getPayloadClient()
  const ref = reference()
  try {
    const enquiry = await payload.create({
      collection: 'enquiries',
      data: {
        reference: ref,
        status: 'new',
        name: join.name,
        country: join.country,
        whatsapp: join.whatsapp,
        serviceOther: 'Academy course',
        message: join.message,
        meta: {
          locale,
          sourcePath: { ar: '/academy', en: '/en/academy', zh: '/academy?lang=zh' }[locale],
          referrer: headerList.get('referer')?.slice(0, 500) ?? undefined,
          userAgent: headerList.get('user-agent')?.slice(0, 500) ?? undefined,
          ipPrefix: prefix,
          submittedAt: new Date().toISOString(),
        },
      },
    })

    if (await sendEnquiryNotification(enquiry, 'كورس التجارة الدولية / Academy course')) {
      await payload
        .update({
          collection: 'enquiries',
          id: enquiry.id,
          data: { notifiedAt: new Date().toISOString() },
        })
        .catch((error) => console.error(`[academy ${ref}] could not record notifiedAt`, error))
    }
    return reply({ ok: true, reference: ref })
  } catch (error) {
    console.error('[academy] could not store join request', error)
    return reply({ ok: false, error: 'retry' }, 500)
  }
}
