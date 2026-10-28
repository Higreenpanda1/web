import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CompanyHero } from '@/components/companies/CompanyHero'
import { HighlightScope } from '@/components/companies/HighlightScope'
import { companyTags } from '@/components/companies/rich'
import { JsonLd } from '@/components/JsonLd'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ButtonLink } from '@/components/ui/Button'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { Section, SectionHeading } from '@/components/ui/Section'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
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

/** The fourteen steps in three phases; steps 10 to 14 come from the course. */
const PHASES = [
  { id: 1, steps: [1, 2, 3, 4] },
  { id: 2, steps: [5, 6, 7, 8, 9] },
  { id: 3, steps: [10, 11, 12, 13, 14] },
] as const
const COURSE_FROM = 10

/**
 * The services each step opens, by slug. Titles come from the CMS so they
 * always match the service pages; a slug that is not published is skipped.
 * Course steps (10 and up) without a service link to the academy instead.
 */
const STEP_SERVICES: Record<number, string[]> = {
  1: ['business-consulting'],
  2: ['business-consulting'],
  3: ['business-consulting'],
  4: ['business-consulting'],
  5: ['trademark-registration'],
  6: ['company-formation', 'hong-kong-company-formation', 'registered-address', 'business-licence-changes'],
  7: ['bank-account-opening', 'alipay-wechat-business-accounts'],
  8: ['work-visa-and-residence', 'business-invitation-letter', 'family-reunion-visa'],
  9: ['accounting-and-tax'],
  10: ['shipping-and-freight'],
  11: ['marketplace-store-setup', 'ecommerce-launch'],
}

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
  const serviceTitle = new Map(services.map((s) => [s.slug, s.title]))
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight
  const pad = (n: number) => String(n).padStart(2, '0')

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
          lead={t('companies.higp.journeyLead')}
        />
        <HighlightScope className="grid gap-12">
          {PHASES.map((phase) => (
            <div
              key={phase.id}
              className="grid items-start gap-6 lg:grid-cols-[14rem_1fr] lg:gap-8"
            >
              <div data-reveal className="border-s-[3px] border-brand-600 ps-4">
                <p className="text-caption font-semibold text-text-brand">
                  {t(`companies.higp.phases.${phase.id}.label`)}
                </p>
                <h3 className="mt-1">{t(`companies.higp.phases.${phase.id}.title`)}</h3>
                <p className="mt-1 text-caption text-text-muted">
                  {t(`companies.higp.phases.${phase.id}.body`)}
                </p>
              </div>
              <ol
                start={phase.steps[0]}
                className="grid list-none gap-4 p-0 md:grid-cols-2"
                aria-label={t(`companies.higp.phases.${phase.id}.title`)}
              >
                {phase.steps.map((step) => {
                  const fromCourse = step >= COURSE_FROM
                  const links = (STEP_SERVICES[step] ?? []).flatMap((slug) => {
                    const title = serviceTitle.get(slug)
                    return title ? [[slug, title] as const] : []
                  })
                  return (
                    <li
                      key={step}
                      data-reveal
                      className={cn(
                        'grid min-w-0 content-start gap-1.5 rounded-lg border border-border-soft bg-surface p-5 shadow-card',
                        fromCourse && 'co-step-course',
                      )}
                    >
                      <span className="ltr-nums font-semibold text-text-brand">
                        <span className="sr-only">{t('companies.higp.stepLabel')} </span>
                        {pad(step)}
                      </span>
                      <h4 className="text-h3">
                        {t(`companies.higp.steps.${step}.title` as 'companies.higp.steps.1.title')}
                      </h4>
                      <p className="text-text-muted">
                        {t.rich(
                          `companies.higp.steps.${step}.body` as 'companies.higp.steps.1.body',
                          companyTags,
                        )}
                      </p>
                      {links.length ? (
                        <ul className="mt-2 grid list-none gap-1.5 p-0">
                          {links.map(([slug, title]) => (
                            <li key={slug}>
                              <Link
                                href={`/services/${slug}`}
                                className="group inline-flex items-center gap-1.5 font-semibold text-text-brand underline-offset-4 hover:underline"
                              >
                                {title}
                                <Arrow
                                  aria-hidden="true"
                                  className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5"
                                />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {fromCourse ? (
                        <Link
                          href="/academy"
                          className="mt-1 w-fit rounded-full bg-[#fbf1dc] px-2.5 py-0.5 text-eyebrow font-semibold text-accent-text hover:underline"
                        >
                          {t('companies.higp.courseTag')}
                        </Link>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
        </HighlightScope>
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
