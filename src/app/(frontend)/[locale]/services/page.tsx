import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ContactPanel } from '@/components/home/ContactPanel'
import { JsonLd } from '@/components/JsonLd'
import { ServiceCard } from '@/components/ServiceCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getServices, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

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
    path: '/services',
    title: t('services.title'),
    description: t('services.lead'),
  })
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, services, settings] = await Promise.all([
    getTranslations({ locale }),
    getServices(locale, { limit: 30 }),
    getSiteSettings(locale),
  ])

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('services.title'), path: '/services' },
        ])}
      />
      <PageHero
        eyebrow={t('services.eyebrow')}
        title={t('services.title')}
        lead={t('services.lead')}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[{ name: t('nav.home'), href: '/' }, { name: t('services.title') }]}
          />
        }
      />

      <Section tone="sunken" labelledBy="services-heading" className="pt-10 md:pt-14">
        <h2 id="services-heading" className="sr-only">
          {t('services.title')}
        </h2>
        {services.length === 0 ? (
          <p className="text-text-muted">{t('services.empty')}</p>
        ) : (
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                locale={locale}
                featured={Boolean(service.featured)}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section className="pt-0 md:pt-0">
        <ContactPanel
          id="enquire"
          locale={locale}
          settings={settings}
          eyebrow={t('home.contactEyebrow')}
          heading={t('home.contactTitle')}
          lead={t('home.contactLead')}
        />
      </Section>
    </>
  )
}
