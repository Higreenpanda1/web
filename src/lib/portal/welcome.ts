/**
 * The email a client gets when the portal opens their account by itself
 * (./auto-accounts.ts). Wording approved by the owner on 28 October 2026.
 * Pure, so the text can be tested and previewed without a database.
 *
 * A client we know only from HubSpot never told us their language, so they
 * get Arabic and English in one email; a client who wrote to us through the
 * site gets the language they used.
 */

export type WelcomeLanguage = 'ar' | 'en' | 'both'

export type WelcomeInput = {
  name: string
  /** "HGP-2026-0005" when the deal has one; a renewal usually does not. */
  reference: string | null
  language: WelcomeLanguage
  /** The sign-in page, per language. */
  urls: { ar: string; en: string }
}

const text = {
  ar: {
    subject: 'حسابك في بوابة HiGreenPanda جاهز',
    body: (name: string, reference: string | null, url: string) =>
      [
        `مرحبا ${name}،`,
        reference ? `استلمنا دفعتك للطلب ${reference}، شكرا لك.` : null,
        'فتحنا لك حساب في بوابة العملاء تتابع فيه طلبك خطوة بخطوة وتحمّل فواتيرك.',
        `ادخل من هنا: ${url} واكتب إيميلك، ويوصلك رمز الدخول.`,
      ]
        .filter(Boolean)
        .join('\n'),
    button: 'الدخول إلى البوابة',
  },
  en: {
    subject: 'Your HiGreenPanda client portal is ready',
    body: (name: string, reference: string | null, url: string) =>
      [
        `Hello ${name},`,
        reference ? `We have received your payment for request ${reference}, thank you.` : null,
        'We have opened a client portal account for you, where you can follow your request step by step and download your invoices.',
        `Sign in at ${url} with your email, and we will send you a sign-in code.`,
      ]
        .filter(Boolean)
        .join('\n'),
    button: 'Open the portal',
  },
} as const

export function welcomeEmail(input: WelcomeInput): { subject: string; text: string; html: string } {
  const languages: Array<'ar' | 'en'> = input.language === 'both' ? ['ar', 'en'] : [input.language]
  const subject = languages.map((l) => text[l].subject).join(' | ')
  const parts = languages.map((l) => ({
    language: l,
    body: text[l].body(input.name, input.reference, input.urls[l]),
    button: text[l].button,
    url: input.urls[l],
  }))

  const html = `<!doctype html><html lang="${languages[0]}"><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.7;margin:0;padding:24px;background:#fff">
<h2 style="color:#276B34;margin:0 0 16px">HiGreenPanda</h2>
${parts
  .map(
    (part) => `<div dir="${part.language === 'ar' ? 'rtl' : 'ltr'}" style="margin:0 0 28px">
${part.body
  .split('\n')
  .map((line) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`)
  .join('\n')}
<p style="margin:16px 0 0"><a href="${escapeHtml(part.url)}" style="display:inline-block;background:#276B34;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">${escapeHtml(part.button)}</a></p>
</div>`,
  )
  .join('\n<hr style="border:none;border-top:1px solid #E3EBE4;margin:0 0 28px">\n')}
<p style="color:#4C574F;font-size:14px"><a href="https://higreenpanda.com" style="color:#276B34">higreenpanda.com</a></p>
</body></html>`

  return { subject, text: parts.map((part) => part.body).join('\n\n———\n\n'), html }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
