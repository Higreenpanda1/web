import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { LanguageForm } from '@/components/portal/LanguageForm'
import { portalLocale } from '@/components/portal/shared'
import { ButtonLink } from '@/components/ui/Button'
import { currentCustomer } from '@/lib/portal/accounts'
import { companyMembers } from '@/lib/portal/requests'
import { getSiteSettings } from '@/lib/queries'
import { localePath, whatsappLink } from '@/lib/url'

import type { Locale } from '@/i18n/routing'

export default async function PortalAccountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const locale = portalLocale((await params).locale, '/portal/account')
  setRequestLocale(locale)
  const customer = await currentCustomer()
  if (!customer) redirect(localePath(locale, '/portal/login'))

  const [t, settings, members] = await Promise.all([
    getTranslations({ locale, namespace: 'portal' }),
    getSiteSettings(locale),
    companyMembers(customer),
  ])

  const rows: Array<[string, string | null | undefined, boolean]> = [
    [t('account.name'), customer.fullName, false],
    [t('account.company'), customer.company, false],
    [t('account.email'), customer.email, true],
    [t('account.whatsapp'), customer.whatsapp, true],
  ]

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-card md:p-8">
        <h1 className="text-h2 text-heading">{t('account.title')}</h1>
        <dl className="mt-6 divide-y divide-border">
          {rows.map(([label, value, latin]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-caption font-semibold text-text-muted">{label}</dt>
              <dd className={latin ? 'ltr-nums text-text' : 'text-text'}>{value || '—'}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6">
          <LanguageForm
            current={customer.preferredLocale === 'en' ? 'en' : 'ar'}
            pageLocale={locale}
            labels={{
              language: t('account.language'),
              save: t('account.save'),
              saved: t('account.saved'),
            }}
          />
        </div>
        <p className="mt-6 text-text-muted">{t('account.note')}</p>
        <ButtonLink
          href={whatsappLink(settings.whatsappNumber, settings.whatsappPrefill ?? undefined)}
          variant="secondary"
          className="mt-4"
          external
        >
          <WhatsAppIcon size={18} />
          {t('login.whatsapp')}
        </ButtonLink>
      </section>

      {members.length > 0 ? (
        <aside className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="text-h3 text-heading">{t('account.members')}</h2>
          <ul className="mt-4 divide-y divide-border">
            {members.map((member) => (
              <li key={member.id} className="py-3">
                <p className="font-semibold text-heading">{member.fullName}</p>
                {member.email ? (
                  <p className="ltr-nums text-caption text-text-muted">{member.email}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  )
}
