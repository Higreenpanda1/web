import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ContactPanel } from '@/components/home/ContactPanel'
import { JsonLd } from '@/components/JsonLd'
import { ServiceCard } from '@/components/ServiceCard'
import { CATEGORY_ICON, ServiceIcon } from '@/components/ServiceIcon'
import { CategoryNav } from '@/components/services/CategoryNav'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getServices, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { groupServices } from '@/lib/services'

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

/**
 * The services index, grouped by area. Twenty services in one grid was a
 * wall; six named bands with a sticky anchor row is a menu. Each band is a
 * landmark with its own heading, so it reads the same way to a screen reader
 * as it does on the page.
 */
export default async function ServicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, services, settings] = await Promise.all([
    getTranslations({ locale }),
    getServices(locale, { limit: 60 }),
    getSiteSettings(locale),
  ])
  const groups = groupServices(services)

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

      {groups.length > 1 ? <CategoryNav groups={groups} locale={locale} /> : null}

      {groups.length === 0 ? (
        <Section tone="sunken">
          <p className="text-text-muted">{t('services.empty')}</p>
        </Section>
      ) : (
        groups.map(({ category, services: members }, index) => (
          <Section
            key={category}
            id={category}
            tone={index % 2 === 0 ? 'sunken' : 'default'}
            labelledBy={`${category}-heading`}
            className="scroll-mt-[calc(var(--header-height)+4rem)] py-12 md:py-16"
          >
            <div className="mb-8 flex items-start gap-4 md:mb-10">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-tint text-text-brand md:size-14">
                <ServiceIcon name={CATEGORY_ICON[category]} size={26} />
              </span>
              <div className="max-w-[var(--measure)]">
                <h2 id={`${category}-heading`} className="text-h2">
                  {t(`services.categories.${category}.title`)}
                </h2>
                <p className="mt-2 text-body-lg text-text-muted">
                  {t(`services.categories.${category}.lead`)}
                </p>
              </div>
            </div>
            <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  locale={locale}
                  featured={Boolean(service.featured)}
                />
              ))}
            </ul>
          </Section>
        ))
      )}

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
