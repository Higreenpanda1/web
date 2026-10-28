import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CompanyHero } from '@/components/companies/CompanyHero'
import { Journey, type JourneyStep } from '@/components/companies/Journey'
import { companyTags } from '@/components/companies/rich'
import { JsonLd } from '@/components/JsonLd'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ButtonLink } from '@/components/ui/Button'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
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
    path: '/higp',
    title: t('companies.higp.name'),
    description: t('companies.higp.metaDescription'),
  })
}

/**
 * HIGP's road, in the design of the original homepage journey (the owner asked
 * for it back on 28 October 2026, without Nasher's import steps). The first
 * six steps keep their original wording (home.journeySteps); the rest are
 * HIGP's other services, titled and summarised from the CMS so they always
 * match their pages. A service that is not published drops out.
 */
const JOURNEY: { icon: JourneyStep['icon']; text?: 1 | 2 | 3 | 4 | 5 | 6; slug?: string }[] = [
  { icon: 'idea', text: 1 },
  { icon: 'research', text: 2 },
  { icon: 'trademark', text: 3, slug: 'trademark-registration' },
  { icon: 'company', text: 4, slug: 'company-formation' },
  { icon: 'hongKong', slug: 'hong-kong-company-formation' },
  { icon: 'address', slug: 'registered-address' },
  { icon: 'bank', slug: 'bank-account-opening' },
  { icon: 'payments', slug: 'alipay-wechat-business-accounts' },
  { icon: 'residence', text: 5, slug: 'work-visa-and-residence' },
  { icon: 'invitation', slug: 'business-invitation-letter' },
  { icon: 'family', slug: 'family-reunion-visa' },
  { icon: 'accounting', text: 6, slug: 'accounting-and-tax' },
  { icon: 'licence', slug: 'business-licence-changes' },
  { icon: 'store', slug: 'marketplace-store-setup' },
]

/**
 * HIGP Consulting & Accounting: the whole road in China from A to Z, from
 * the market study to growth, in the owner's fourteen steps (28 October
 * 2026). The journey that used to sit on the homepage lives here now.
 */
export default async function HigpPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const [t, services] = await Promise.all([
    getTranslations({ locale }),
    getServices(locale, { limit: 60 }),
  ])
  const bySlug = new Map(services.map((service) => [service.slug, service]))
  const steps: JourneyStep[] = JOURNEY.flatMap(({ icon, text, slug }) => {
    const service = slug ? bySlug.get(slug) : undefined
    if (slug && !service) return []
    const type = service?.applicationType
    return [
      {
        icon,
        title: text
          ? t(`home.journeySteps.${text}.title` as 'home.journeySteps.1.title')
          : service!.title,
        body: text
          ? t(`home.journeySteps.${text}.body` as 'home.journeySteps.1.body')
          : service!.summary,
        href: service ? `/services/${service.slug}` : '/apply/consultation',
        linkLabel: service ? t('cta.seeService') : t('cta.bookConsultation'),
        apply:
          service && type
            ? {
                href: `/apply/${type}?service=${service.slug}`,
                label: t(`apply.types.${type}.cta` as 'apply.types.consultation.cta'),
              }
            : undefined,
      },
    ]
  })

  return (
    <>
      <ScrollReveal />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('companies.higp.name'), path: '/higp' },
        ])}
      />

      <CompanyHero
        name={t('companies.higp.name')}
        title={t('companies.higp.pageTitle')}
        lead={t.rich('companies.higp.pageLead', companyTags)}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[{ name: t('nav.home'), href: '/' }, { name: t('companies.higp.short') }]}
          />
        }
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="#journey" size="lg">
            {t('cta.exploreJourney')}
          </ButtonLink>
          <ButtonLink href="/apply/consultation" size="lg" variant="secondary">
            {t('cta.bookConsultation')}
          </ButtonLink>
        </div>
      </CompanyHero>

      <Section id="journey" labelledBy="higp-journey-heading" className="scroll-mt-20">
        <SectionHeading
          id="higp-journey-heading"
          eyebrow={t('companies.higp.journeyEyebrow')}
          title={t('companies.higp.journeyTitle')}
          lead={t('home.journeyLead')}
          align="center"
        />
        <Journey steps={steps} locale={locale} stepLabel={t('home.journeyStep')} />
        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink href="/apply/consultation" size="lg">
            {t('cta.bookConsultation')}
          </ButtonLink>
          <ButtonLink href="/licences#guangzhou" size="lg" variant="secondary">
            {t('companies.higp.viewLicence')}
          </ButtonLink>
        </div>
      </Section>
    </>
  )
}
