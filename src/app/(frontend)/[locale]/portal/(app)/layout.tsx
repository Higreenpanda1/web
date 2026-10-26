import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { PortalNav } from '@/components/portal/PortalNav'
import { Container } from '@/components/ui/Container'
import { currentCustomer } from '@/lib/portal/accounts'
import { localePath } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/** Every page in here needs a signed-in client; anyone else goes to the sign-in page. */
export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: Locale }>
}) {
  const { locale: raw } = await params
  const locale = raw === 'zh' ? 'en' : raw
  const customer = await currentCustomer()
  if (!customer) redirect(localePath(locale, '/portal/login'))
  const t = await getTranslations({ locale, namespace: 'portal' })

  return (
    <div className="bg-surface-sunken pb-16 md:pb-24">
      <div className="bg-gradient-deep text-text-on-inverse">
        <Container className="flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between md:py-10">
          <div>
            <p className="text-eyebrow font-semibold text-accent">{t('title')}</p>
            <p className="mt-1 text-h2 text-white">
              {t('list.welcome', { name: customer.fullName })}
            </p>
          </div>
          <PortalNav
            locale={locale}
            labels={{
              requests: t('nav.requests'),
              account: t('nav.account'),
              signOut: t('nav.signOut'),
            }}
          />
        </Container>
      </div>
      <Container className="pt-8 md:pt-10">{children}</Container>
    </div>
  )
}
