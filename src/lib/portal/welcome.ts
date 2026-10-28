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

/** Which of the brand's two companies serves the client, and so sends the welcome. */
export type WelcomeCompany = 'higp' | 'nasher'

/** The companies' names as the site shows them (src/messages, home.companies). */
export const COMPANY_NAMES: Record<WelcomeCompany, { ar: string; en: string }> = {
  higp: { ar: 'إتش آي جي بي للاستشارات والمحاسبة', en: 'HIGP Consulting & Accounting' },
  nasher: { ar: 'ناشر للتجارة الدولية', en: 'Nasher International Trading' },
}

export type WelcomeInput = {
  name: string
  /** "HGP-2026-0005" when the deal has one; a renewal usually does not. */
  reference: string | null
  language: WelcomeLanguage
  company: WelcomeCompany
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

export function welcomeEmail(input: WelcomeInput): {
  subject: string
  text: string
  html: string
  /** The sender's display name: the company, under the brand. */
  fromName: string
} {
  const languages: Array<'ar' | 'en'> = input.language === 'both' ? ['ar', 'en'] : [input.language]
  const subject = languages.map((l) => text[l].subject).join(' | ')
  const parts = languages.map((l) => ({
    language: l,
    body: text[l].body(input.name, input.reference, input.urls[l]),
    button: text[l].button,
    url: input.urls[l],
  }))

  // Tables and inline styles: the only layout every mail app draws the same.
  // The site's own faces (Amiri for headings, Noto Kufi Arabic for Arabic
  // text, IBM Plex Sans for Latin) load where the mail app allows web fonts,
  // from a fixed path under /fonts/email; elsewhere the stacks fall back to
  // the closest system faces.
  const origin = new URL(input.urls.en).origin
  const company = COMPANY_NAMES[input.company]
  // Names in the reader's language, both when the email is in both (owner, 28 October 2026).
  const brandLine = languages
    .map(
      (l) =>
        `<span dir="${l === 'ar' ? 'rtl' : 'ltr'}">${l === 'ar' ? 'هاي جرين باندا' : 'HiGreenPanda'}</span>`,
    )
    .join('<br>')
  const companyLine = languages
    .map((l) => `<span dir="${l === 'ar' ? 'rtl' : 'ltr'}">${escapeHtml(company[l])}</span>`)
    .join('<br>')
  const font = `${origin}/fonts/email`
  const heading = "'HGP Amiri','Amiri','Times New Roman','Traditional Arabic',Georgia,serif"
  const body = "'HGP Plex','HGP Kufi','Segoe UI','Geeza Pro',Tahoma,Helvetica,Arial,sans-serif"
  const sections = parts
    .map((part, index) => {
      const rtl = part.language === 'ar'
      const align = rtl ? 'right' : 'left'
      const [greeting, ...lines] = part.body.split('\n')
      return `<tr><td dir="${rtl ? 'rtl' : 'ltr'}" style="padding:${index === 0 ? '44px' : '36px'} 44px 40px;text-align:${align}">
<p style="margin:0 0 6px;font-family:${heading};font-size:28px;line-height:1.35;font-weight:700;color:#062414">${escapeHtml(greeting ?? '')}</p>
<div style="width:56px;height:2px;background:#E0A32E;margin:0 0 24px;${rtl ? 'margin-left:auto' : ''}"></div>
${lines.map((line) => `<p style="margin:0 0 14px;font-family:${body};font-size:16px;line-height:1.9;color:#3A473E">${linkify(highlight(escapeHtml(line), input.reference), part.url)}</p>`).join('\n')}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0 0;${rtl ? 'margin-left:auto' : ''}"><tr><td style="background:#062414;border-radius:999px;border:1px solid #E0A32E">
<a href="${escapeHtml(part.url)}" style="display:inline-block;padding:15px 38px;font-family:${body};font-size:16px;font-weight:600;letter-spacing:0.2px;color:#FFFDF8;text-decoration:none">${escapeHtml(part.button)}</a>
</td></tr></table>
</td></tr>`
    })
    .join(
      '\n<tr><td style="padding:0 44px"><div style="border-top:1px solid #E7DFCD;font-size:0;line-height:0">&nbsp;</div></td></tr>\n',
    )

  const html = `<!doctype html><html lang="${languages[0]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
@font-face{font-family:'HGP Amiri';font-weight:700;src:url(${font}/amiri-arabic-700.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF}
@font-face{font-family:'HGP Amiri';font-weight:700;src:url(${font}/amiri-latin-700.woff2) format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:'HGP Kufi';font-weight:400;src:url(${font}/kufi-arabic-400.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF}
@font-face{font-family:'HGP Kufi';font-weight:600;src:url(${font}/kufi-arabic-600.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF}
@font-face{font-family:'HGP Plex';font-weight:400 700;src:url(${font}/plex-latin-400.woff2) format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
@media (max-width:520px){.hgp-pad td[dir]{padding-left:26px!important;padding-right:26px!important}}
</style></head>
<body style="margin:0;padding:0;background:#F7F3EA">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EA"><tr><td align="center" style="padding:36px 12px">
<table role="presentation" class="hgp-pad" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#FFFDF8;border-radius:20px;overflow:hidden;border:1px solid #E7DFCD">
<tr><td align="center" style="background:#062414;background-image:radial-gradient(420px 220px at 15% 0%,rgba(55,141,66,0.35),transparent 70%),radial-gradient(320px 200px at 95% 0%,rgba(224,163,46,0.16),transparent 70%);padding:34px 24px 30px">
<p style="margin:0;font-family:${heading};font-size:${languages.length > 1 ? 30 : 34}px;line-height:1.35;font-weight:700;letter-spacing:0.5px;color:#FFFDF8">${brandLine}</p>
<div style="width:40px;height:1px;background:#E0A32E;margin:14px auto 12px;font-size:0;line-height:0">&nbsp;</div>
<p style="margin:0;font-family:${body};font-size:14px;line-height:1.6;font-weight:600;letter-spacing:0.3px;color:#E0A32E">${companyLine}</p>
</td></tr>
<tr><td style="background:#E0A32E;height:3px;font-size:0;line-height:0">&nbsp;</td></tr>
${sections}
<tr><td align="center" style="background:#F4F8F5;padding:22px 24px;border-top:1px solid #E7DFCD;font-family:${body};font-size:13px;color:#56645A">
<a href="${origin}" style="color:#062414;text-decoration:none;font-weight:600;letter-spacing:0.4px">higreenpanda.com</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`

  return {
    subject,
    fromName: `${company.en} | HiGreenPanda`,
    text: parts.map((part) => part.body).join('\n\n———\n\n'),
    html,
  }
}

/** The request's reference inside a line, in the brand's gold. */
function highlight(line: string, reference: string | null): string {
  if (!reference) return line
  const shown = escapeHtml(reference)
  return line.replace(
    shown,
    `<span dir="ltr" style="color:#8A5B00;font-weight:600;white-space:nowrap">${shown}</span>`,
  )
}

/** The sign-in address inside a line, as a link. */
function linkify(line: string, url: string): string {
  const shown = escapeHtml(url)
  return line.replace(
    shown,
    `<a href="${shown}" style="color:#062414;font-weight:600;text-decoration:underline;text-decoration-color:#E0A32E;text-underline-offset:4px" dir="ltr">${shown.replace(/^https:\/\//, '')}</a>`,
  )
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
