import { Clock, Mail, MapPin } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { EnquiryFormSection } from '@/components/forms/EnquiryFormSection'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { JsonLd } from '@/components/JsonLd'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ButtonLink } from '@/components/ui/Button'
import { PageHero } from '@/components/ui/PageHero'
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

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ service?: string }>
}) {
  const [{ locale }, { service }] = await Promise.all([params, searchParams])
  setRequestLocale(locale)

  const [t, settings] = await Promise.all([getTranslations({ locale }), getSiteSettings(locale)])
  const whatsapp = whatsappLink(settings.whatsappNumber, settings.whatsappPrefill ?? undefined)

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('contact.title'), path: '/contact' },
        ])}
      />

      <PageHero
        eyebrow={t('contact.eyebrow')}
        title={t('contact.title')}
        lead={t('contact.lead')}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[{ name: t('nav.home'), href: '/' }, { name: t('contact.title') }]}
          />
        }
      />

      <Section tone="sunken" labelledBy="contact-heading" className="pt-10 md:pt-14">
        <h2 id="contact-heading" className="sr-only">
          {t('contact.title')}
        </h2>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-12">
          <div className="space-y-5">
            <div className="relative isolate overflow-hidden rounded-xl bg-gradient-deep p-6 text-white">
              <div
                className="absolute inset-0 -z-10 bg-dots-inverse opacity-40"
                aria-hidden="true"
              />
              <h3 className="text-white">{t('contact.directTitle')}</h3>
              <p className="mt-2 text-brand-100">{t('contact.whatsappNote')}</p>
              <ButtonLink href={whatsapp} size="lg" variant="inverse" className="mt-6 w-full">
                <WhatsAppIcon size={22} className="text-brand-700" />
                {t('cta.whatsapp')}
              </ButtonLink>
              <p className="mt-3 text-center text-caption text-brand-300">
                <span className="ltr-nums">{settings.whatsappNumber}</span>
              </p>
            </div>

            <dl className="divide-y divide-border-soft rounded-xl border border-border-soft bg-surface px-6">
              <div className="flex gap-4 py-5">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-surface-tint text-text-brand">
                  <Mail size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <dt className="text-caption font-semibold text-text-muted">
                    {t('contact.emailLabel')}
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={`mailto:${settings.email}`}
                      className="ltr-nums text-caption font-semibold break-words"
                    >
                      {settings.email}
                    </a>
                  </dd>
                </div>
              </div>

              {settings.offices && settings.offices.length > 0 ? (
                <div className="flex gap-4 py-5">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-surface-tint text-text-brand">
                    <MapPin size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <dt className="text-caption font-semibold text-text-muted">
                      {t('contact.officesLabel')}
                    </dt>
                    {settings.offices.map((office, index) => (
                      <dd key={office.id ?? index} className="mt-0.5">
                        <span className="font-semibold">{office.city}</span>
                        {office.address ? (
                          <span className="text-text-muted"> — {office.address}</span>
                        ) : null}
                      </dd>
                    ))}
                  </div>
                </div>
              ) : null}

              {settings.workingHours ? (
                <div className="flex gap-4 py-5">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-surface-tint text-text-brand">
                    <Clock size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <dt className="text-caption font-semibold text-text-muted">
                      {t('contact.hoursLabel')}
                    </dt>
                    <dd className="mt-0.5 font-semibold">{settings.workingHours}</dd>
                  </div>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-xl border border-border-soft bg-surface p-6 shadow-card md:p-10">
            <h3>{t('contact.form.title')}</h3>
            <p className="mt-2 text-text-muted">{t('contact.formLead')}</p>
            <div className="mt-8">
              <EnquiryFormSection locale={locale} defaultService={service} />
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
