import { getTranslations, setRequestLocale } from 'next-intl/server'

import { JsonLd } from '@/components/JsonLd'
import { ServiceCard } from '@/components/ServiceCard'
import { Section, SectionHeading } from '@/components/ui/Section'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getServices } from '@/lib/queries'
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

  const [t, services] = await Promise.all([
    getTranslations({ locale }),
    getServices(locale, { limit: 30 }),
  ])

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('services.title'), path: '/services' },
        ])}
      />
      <Section labelledBy="services-heading">
        <SectionHeading id="services-heading" title={t('services.title')} lead={t('services.lead')} />
        {services.length === 0 ? (
          <p className="text-[var(--text-muted)]">{t('services.empty')}</p>
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
    </>
  )
}
