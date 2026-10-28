import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CompanyFilm } from '@/components/companies/CompanyFilm'
import '@/components/companies/companies.css'
import { ContactPanel } from '@/components/home/ContactPanel'
import { JsonLd } from '@/components/JsonLd'
import { ServiceCard } from '@/components/ServiceCard'
import { CATEGORY_ICON, ServiceIcon } from '@/components/ServiceIcon'
import { CategoryHashRedirect } from '@/components/services/CategoryHashRedirect'
import { CategoryNav } from '@/components/services/CategoryNav'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getServices, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import {
  isServiceCompany,
  SERVICE_COMPANIES,
  serviceCompany,
  type ServiceCompany,
} from '@/lib/service-company'
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
 * The services index, by company (owner, 28 October 2026). Without a choice
 * it opens on the two companies, HIGP first, each card leading to the same
 * page filtered with `?company=`; the header's services menu links straight
 * there. Inside a company the services stay grouped by area: named bands
 * with a sticky anchor row, each band a landmark with its own heading.
 */
export default async function ServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ company?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  setRequestLocale(locale)
  const company = isServiceCompany(query.company) ? query.company : null

  const [t, services, settings] = await Promise.all([
    getTranslations({ locale }),
    getServices(locale, { limit: 60 }),
    getSiteSettings(locale),
  ])
  const groups = company
    ? groupServices(services.filter((service) => serviceCompany(service) === company))
    : []
  const companyName = company ? t(`companies.${company}.name`) : null
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('services.title'), path: '/services' },
        ])}
      />
      {company && companyName ? (
        <PageHero
          eyebrow={t('services.eyebrow')}
          title={t('services.company.title', { name: companyName })}
          lead={t(`services.company.lead.${company}`)}
          breadcrumb={
            <Breadcrumb
              label={t('a11y.breadcrumb')}
              items={[
                { name: t('nav.home'), href: '/' },
                { name: t('services.title'), href: '/services' },
                { name: t(`companies.${company}.short`) },
              ]}
            />
          }
        >
          <CompanySwitch current={company} locale={locale} />
        </PageHero>
      ) : (
        <PageHero
          eyebrow={t('services.eyebrow')}
          title={t('services.title')}
          lead={t('services.company.chooseLead')}
          breadcrumb={
            <Breadcrumb
              label={t('a11y.breadcrumb')}
              items={[{ name: t('nav.home'), href: '/' }, { name: t('services.title') }]}
            />
          }
          after={
            <ul className="grid list-none gap-5 p-0 md:grid-cols-2">
              {SERVICE_COMPANIES.map((id, index) => (
                <li key={id} className="min-w-0">
                  <Link href={`/services?company=${id}`} className="co-card group">
                    <CompanyFilm
                      label={id === 'higp' ? 'HIGP' : 'NASHER'}
                      kicker={t(`companies.${id}.filmKicker`)}
                      delay={index * 700}
                      frames={[1, 2, 3, 4].map((n) => ({
                        src: `/brand/companies/${id}-${n}.webp`,
                        caption: t(`companies.${id}.film.${n}` as 'companies.higp.film.1'),
                      }))}
                    />
                    <div className="grid gap-2 p-5 md:p-6">
                      <h2 className="text-h3">
                        <span className="co-name">{t(`companies.${id}.name`)}</span>
                      </h2>
                      <p className="text-text-muted">{t(`services.company.line.${id}`)}</p>
                      <span className="mt-1 inline-flex items-center gap-2 font-semibold text-accent-text">
                        {t(`services.company.view.${id}`)}
                        <Arrow
                          size={18}
                          strokeWidth={2}
                          aria-hidden="true"
                          className="transition-transform rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          }
        />
      )}
      {company ? null : <CategoryHashRedirect />}

      {groups.length > 1 ? <CategoryNav groups={groups} locale={locale} /> : null}

      {!company ? null : groups.length === 0 ? (
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

/**
 * The two companies as a segmented switch under the title, the current one
 * filled, plus the way back to the choice. Plain links: the page is server
 * rendered either way.
 */
async function CompanySwitch({ current, locale }: { current: ServiceCompany; locale: Locale }) {
  const t = await getTranslations({ locale })
  const Back = locale === 'ar' ? ArrowRight : ArrowLeft

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <nav
        aria-label={t('services.company.switchLabel')}
        className="inline-flex rounded-full border border-border-strong bg-surface p-1"
      >
        {SERVICE_COMPANIES.map((id) => (
          <Link
            key={id}
            href={`/services?company=${id}`}
            aria-current={id === current ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-10 items-center rounded-full px-4 text-caption font-semibold no-underline transition-colors',
              id === current
                ? 'bg-[linear-gradient(135deg,#f0c56a,#e0a32e_55%,#b9821f)] text-[#10220f]'
                : 'text-heading hover:bg-surface-tint-soft',
            )}
          >
            {t(`companies.${id}.name`)}
          </Link>
        ))}
      </nav>
      <Link
        href="/services"
        className="inline-flex items-center gap-1.5 text-caption font-semibold text-text-muted no-underline hover:text-heading"
      >
        <Back size={16} strokeWidth={2} aria-hidden="true" />
        {t('services.company.back')}
      </Link>
    </div>
  )
}
