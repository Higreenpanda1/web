import { getTranslations, setRequestLocale } from 'next-intl/server'

import { FormAlert } from '@/components/forms/fields'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { PortalCard } from '@/components/portal/PortalCard'
import { portalLocale } from '@/components/portal/shared'
import { Button, ButtonLink } from '@/components/ui/Button'
import { signInFromLink } from '@/app/actions/portal'
import { getSiteSettings } from '@/lib/queries'
import { whatsappLink } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Where a WhatsApp sign-in link lands. The link is used only when the client
 * presses the button: WhatsApp opens every link once itself to draw its
 * preview, and a link that signed in on GET would be spent by that.
 */
export default async function PortalLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ t?: string; error?: string }>
}) {
  const [{ locale: raw }, { t: token, error }] = await Promise.all([params, searchParams])
  const locale = portalLocale(raw, `/portal/link${token ? `?t=${encodeURIComponent(token)}` : ''}`)
  setRequestLocale(locale)
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'portal' }),
    getSiteSettings(locale),
  ])

  if (error || !token) {
    return (
      <PortalCard title={t('login.linkTitle')}>
        <FormAlert>{t('errors.link')}</FormAlert>
        <ButtonLink
          href={whatsappLink(settings.whatsappNumber, settings.whatsappPrefill ?? undefined)}
          variant="secondary"
          className="mt-6"
          external
        >
          <WhatsAppIcon size={18} />
          {t('login.whatsapp')}
        </ButtonLink>
      </PortalCard>
    )
  }

  return (
    <PortalCard title={t('login.linkTitle')} lead={t('login.linkLead')}>
      <form action={signInFromLink}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="token" value={token} />
        <Button type="submit" size="lg" className="w-full">
          {t('login.signIn')}
        </Button>
      </form>
    </PortalCard>
  )
}
