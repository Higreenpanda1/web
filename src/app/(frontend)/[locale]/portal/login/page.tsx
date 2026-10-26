import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { LoginForm } from '@/components/portal/LoginForm'
import { PortalCard } from '@/components/portal/PortalCard'
import { portalLocale } from '@/components/portal/shared'
import { ButtonLink } from '@/components/ui/Button'
import { currentCustomer } from '@/lib/portal/accounts'
import { getSiteSettings } from '@/lib/queries'
import { localePath, whatsappLink } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale: locale === 'zh' ? 'en' : locale, namespace: 'portal' })
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default async function PortalLoginPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const locale = portalLocale((await params).locale, '/portal/login')
  setRequestLocale(locale)
  if (await currentCustomer()) redirect(localePath(locale, '/portal'))

  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'portal' }),
    getSiteSettings(locale),
  ])

  return (
    <PortalCard title={t('title')} lead={t('lead')}>
      <LoginForm
        locale={locale}
        copy={{
          email: t('login.email'),
          send: t('login.send'),
          sending: t('login.sending'),
          sent: t.raw('login.sent') as string,
          code: t('login.code'),
          signIn: t('login.signIn'),
          signingIn: t('login.signingIn'),
          resend: t('login.resend'),
          resent: t('login.resent'),
          otherEmail: t('login.otherEmail'),
          errors: {
            wrong: t('errors.wrong'),
            expired: t('errors.expired'),
            tooMany: t('errors.tooMany'),
            email: t('errors.email'),
          },
        }}
      />
      <div className="mt-8 border-t border-border pt-6 text-text-muted">
        <p>{t('login.noAccount')}</p>
        <ButtonLink
          href={whatsappLink(settings.whatsappNumber, settings.whatsappPrefill ?? undefined)}
          variant="secondary"
          className="mt-4"
          external
        >
          <WhatsAppIcon size={18} />
          {t('login.whatsapp')}
        </ButtonLink>
      </div>
    </PortalCard>
  )
}
