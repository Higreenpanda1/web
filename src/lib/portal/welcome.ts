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

  // Tables and inline styles: the only layout every mail app draws the same.
  const origin = new URL(input.urls.en).origin
  const sections = parts
    .map((part, index) => {
      const rtl = part.language === 'ar'
      const align = rtl ? 'right' : 'left'
      const [greeting, ...lines] = part.body.split('\n')
      return `<tr><td dir="${rtl ? 'rtl' : 'ltr'}" style="padding:${index === 0 ? '36px' : '28px'} 40px 32px;text-align:${align};font-family:${rtl ? "Tahoma,'Segoe UI',Arial" : "'Segoe UI',Helvetica,Arial"},sans-serif;color:#1C2B20">
<p style="margin:0 0 18px;font-size:20px;font-weight:700;color:#1C2B20">${escapeHtml(greeting ?? '')}</p>
${lines.map((line) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.8;color:#3D4A40">${linkify(escapeHtml(line), part.url)}</p>`).join('\n')}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 0;${rtl ? 'margin-left:auto' : ''}"><tr><td style="background:#276B34;border-radius:10px">
<a href="${escapeHtml(part.url)}" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(part.button)}</a>
</td></tr></table>
</td></tr>`
    })
    .join(
      '\n<tr><td style="padding:0 40px"><div style="border-top:1px solid #E3EBE4"></div></td></tr>\n',
    )

  const html = `<!doctype html><html lang="${languages[0]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#EEF4EF">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF4EF"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(39,107,52,0.08)">
<tr><td align="center" style="background:#276B34;padding:26px 24px"><img src="${origin}/brand/web/logo-wordmark-white@2x.png" alt="HiGreenPanda" height="40" style="height:40px;width:auto;display:block;border:0"></td></tr>
${sections}
<tr><td align="center" style="background:#F6FAF6;padding:18px 24px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#6B776E;border-top:1px solid #E3EBE4">
<a href="${origin}" style="color:#276B34;text-decoration:none;font-weight:600">higreenpanda.com</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`

  return { subject, text: parts.map((part) => part.body).join('\n\n———\n\n'), html }
}

/** The sign-in address inside a line, as a link. */
function linkify(line: string, url: string): string {
  const shown = escapeHtml(url)
  return line.replace(
    shown,
    `<a href="${shown}" style="color:#276B34;font-weight:600;text-decoration:none" dir="ltr">${shown.replace(/^https:\/\//, '')}</a>`,
  )
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
