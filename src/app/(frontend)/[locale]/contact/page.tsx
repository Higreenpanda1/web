import { Clock, Mail, MapPin, MessageCircle } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { headers } from 'next/headers'

import { JsonLd } from '@/components/JsonLd'
import { EnquiryFormSection } from '@/components/forms/EnquiryFormSection'
import { Section } from '@/components/ui/Section'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { whatsappLink } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return buildMetadata({
    locale,
    path: '/contact',
    title: t('contact.title'),
    description: t('contact.lead'),
  })
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, settings, headerList] = await Promise.all([
    getTranslations({ locale }),
    getSiteSettings(locale),
    headers(),
  ])
  const nonce = headerList.get('x-nonce') ?? undefined

  return (
    <>
      <JsonLd
        nonce={nonce}
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('contact.title'), path: '/contact' },
        ])}
      />

      <Section labelledBy="contact-heading">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h1 id="contact-heading" className="text-h1">
              {t('contact.title')}
            </h1>
            <p className="mt-5 max-w-[var(--measure)] text-body-lg text-[var(--text-muted)]">
              {t('contact.lead')}
            </p>

            <h2 className="mt-10 text-h3">{t('contact.directTitle')}</h2>
            <p className="mt-2 text-[var(--text-muted)]">{t('contact.whatsappNote')}</p>

            <dl className="mt-6 space-y-5">
              <div className="flex items-start gap-3">
                <MessageCircle
                  size={22}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-[var(--brand-700)]"
                />
                <div>
                  <dt className="font-semibold">{t('contact.phoneLabel')}</dt>
                  <dd>
                    <a
                      href={whatsappLink(settings.whatsappNumber, settings.whatsappPrefill ?? undefined)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ltr-nums"
                    >
                      {settings.whatsappNumber}
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail
                  size={22}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-[var(--brand-700)]"
                />
                <div>
                  <dt className="font-semibold">{t('contact.emailLabel')}</dt>
                  <dd>
                    <a href={`mailto:${settings.email}`} className="ltr-nums">
                      {settings.email}
                    </a>
                  </dd>
                </div>
              </div>

              {settings.offices && settings.offices.length > 0 ? (
                <div className="flex items-start gap-3">
                  <MapPin
                    size={22}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-[var(--brand-700)]"
                  />
                  <div>
                    <dt className="font-semibold">{t('contact.officesLabel')}</dt>
                    {settings.offices.map((office, index) => (
                      <dd key={office.id ?? index} className="text-[var(--text-muted)]">
                        <span className="text-[var(--text)]">{office.city}</span>
                        {office.address ? <> — {office.address}</> : null}
                      </dd>
                    ))}
                  </div>
                </div>
              ) : null}

              {settings.workingHours ? (
                <div className="flex items-start gap-3">
                  <Clock
                    size={22}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-[var(--brand-700)]"
                  />
                  <div>
                    <dt className="font-semibold">{t('contact.hoursLabel')}</dt>
                    <dd className="text-[var(--text-muted)]">{settings.workingHours}</dd>
                  </div>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
            <h2 className="mb-6 text-h3">{t('contact.form.title')}</h2>
            <EnquiryFormSection locale={locale} />
          </div>
        </div>
      </Section>
    </>
  )
}
