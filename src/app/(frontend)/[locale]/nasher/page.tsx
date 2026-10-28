import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CompanyHero } from '@/components/companies/CompanyHero'
import { HighlightScope } from '@/components/companies/HighlightScope'
import { companyTags } from '@/components/companies/rich'
import { JsonLd } from '@/components/JsonLd'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ButtonLink } from '@/components/ui/Button'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { Section, SectionHeading } from '@/components/ui/Section'
import { breadcrumbJsonLd } from '@/lib/jsonld'
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
    path: '/nasher',
    title: t('companies.nasher.name'),
    description: t('companies.nasher.metaDescription'),
  })
}

const SERVICES = [1, 2, 3, 4] as const
const PROCESS = [1, 2, 3, 4] as const

/**
 * Nasher International Trading: parts for yachts, boats and cars, always in
 * that order (owner, 28 October 2026). Services, then how an order runs.
 * The longer scroll story the owner described comes as a second update.
 */
export default async function NasherPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale })

  return (
    <>
      <ScrollReveal />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('companies.nasher.name'), path: '/nasher' },
        ])}
      />

      <CompanyHero
        name={t('companies.nasher.name')}
        title={t('companies.nasher.pageTitle')}
        lead={t.rich('companies.nasher.pageLead', companyTags)}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[{ name: t('nav.home'), href: '/' }, { name: t('companies.nasher.short') }]}
          />
        }
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/contact" size="lg">
            {t('cta.contactUs')}
          </ButtonLink>
          <ButtonLink href="/licences#nasher" size="lg" variant="secondary">
            {t('companies.nasher.viewLicence')}
          </ButtonLink>
        </div>
      </CompanyHero>

      <Section tone="sunken" labelledBy="nasher-services-heading">
        <HighlightScope>
          <SectionHeading
            id="nasher-services-heading"
            eyebrow={t('companies.nasher.servicesEyebrow')}
            title={t('companies.nasher.servicesTitle')}
            lead={t.rich('companies.nasher.servicesLead', companyTags)}
          />
        </HighlightScope>
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((n) => (
            <li
              key={n}
              data-reveal
              className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface px-5 py-4 [font-family:var(--font-display)] text-h3 font-bold text-heading shadow-card"
            >
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
              {t(`companies.nasher.services.${n}`)}
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="nasher-process-heading">
        <SectionHeading
          id="nasher-process-heading"
          eyebrow={t('companies.nasher.processEyebrow')}
          title={t('companies.nasher.processTitle')}
          lead={t('companies.nasher.processLead')}
        />
        <ol className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((n) => (
            <li
              key={n}
              data-reveal
              className="grid content-start gap-1.5 rounded-b-lg border-t-2 border-accent bg-surface-sunken p-5"
            >
              <span className="ltr-nums font-semibold text-text-brand">{`0${n}`}</span>
              <h3 className="text-h3">{t(`companies.nasher.process.${n}.title`)}</h3>
              <p className="text-text-muted">{t(`companies.nasher.process.${n}.body`)}</p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  )
}
