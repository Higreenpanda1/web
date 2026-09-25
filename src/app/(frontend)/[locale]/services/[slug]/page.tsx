import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { EnquiryFormSection } from '@/components/forms/EnquiryFormSection'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { JsonLd } from '@/components/JsonLd'
import { RichText } from '@/components/RichText'
import { ServiceIcon } from '@/components/ServiceIcon'
import { CostEstimator } from '@/components/services/CostEstimator'
import { PriceTag } from '@/components/services/PriceTag'
import { Accordion } from '@/components/ui/Accordion'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { PageHero } from '@/components/ui/PageHero'
import { Link } from '@/i18n/navigation'
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld'
import { hasPrice } from '@/lib/price'
import { getServiceBySlug, getServices, getSiteSettings } from '@/lib/queries'
import { buildMetadata, mediaSrc } from '@/lib/seo'
import { whatsappLink } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { Media } from '@/payload-types'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const service = await getServiceBySlug(slug, locale)
  if (!service) return {}

  return buildMetadata({
    locale,
    path: `/services/${slug}`,
    title: service.title,
    description: service.summary,
    seo: service.seo,
  })
}

/**
 * A service page. The body sells; the sidebar converts. When the service has
 * a structured application form the sidebar leads with it — a price, a
 * "have these ready" list, and one button — and the general enquiry form
 * drops below as the quieter option. Without one, the enquiry form stays in
 * the sidebar, pre-selected to this service.
 */
export default async function ServicePage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const service = await getServiceBySlug(slug, locale)
  if (!service) notFound()

  const [t, settings, all] = await Promise.all([
    getTranslations({ locale }),
    getSiteSettings(locale),
    getServices(locale, { limit: 60 }),
  ])

  const image = typeof service.image === 'object' ? (service.image as Media) : null
  const featureSrc = mediaSrc(image, 'feature')
  const faqs = (service.faqs ?? []).map((item) => ({
    question: item.question,
    answer: item.answer,
  }))
  const requirements = service.requirements ?? []
  const applicationType = service.applicationType ?? null
  const applyHref = applicationType ? `/apply/${applicationType}?service=${service.slug}` : null
  // Siblings from the same area first; the rest of the catalogue after.
  const others = [
    ...all.filter((entry) => entry.id !== service.id && entry.category === service.category),
    ...all.filter((entry) => entry.id !== service.id && entry.category !== service.category),
  ].slice(0, 6)
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight
  const whatsapp = whatsappLink(
    settings.whatsappNumber,
    t('services.enquireAbout', { service: service.title }),
  )

  return (
    <>
      <JsonLd data={serviceJsonLd(service, locale, settings)} />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('services.title'), path: '/services' },
          { name: service.title, path: `/services/${slug}` },
        ])}
      />
      {faqs.length > 0 ? <JsonLd data={faqJsonLd(faqs)} /> : null}

      <PageHero
        eyebrow={t(`services.categories.${service.category ?? 'import'}.title`)}
        title={service.title}
        lead={service.summary}
        icon={<ServiceIcon name={service.icon} size={30} />}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[
              { name: t('nav.home'), href: '/' },
              { name: t('services.title'), href: '/services' },
              { name: service.title },
            ]}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={applyHref ?? '#service-enquiry'} size="lg">
              {applicationType ? t(`apply.types.${applicationType}.cta`) : t('cta.enquire')}
            </ButtonLink>
            <ButtonLink
              href={whatsapp}
              size="lg"
              variant="secondary"
              data-analytics-event="whatsapp_click"
              data-analytics-location="service"
            >
              <WhatsAppIcon size={20} className="text-text-brand" />
              {t('cta.whatsapp')}
            </ButtonLink>
          </div>
          <PriceTag service={service} locale={locale} />
        </div>
      </PageHero>

      <Container className="py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <div className="min-w-0">
            {featureSrc ? (
              <Image
                src={featureSrc}
                alt={image?.alt ?? ''}
                width={1280}
                height={800}
                priority
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="mb-10 aspect-[16/10] w-full rounded-xl object-cover shadow-card"
              />
            ) : null}

            <RichText data={service.body} className="text-body-lg" />

            {service.highlights && service.highlights.length > 0 ? (
              <div className="mt-12">
                <h2 className="text-h3">{t('services.highlightsTitle')}</h2>
                <ul className="mt-5 grid list-none gap-3 p-0 sm:grid-cols-2">
                  {service.highlights.map((item, index) => (
                    <li
                      key={item.id ?? index}
                      className="flex items-start gap-2.5 rounded-lg border border-border-soft bg-surface-tint-soft p-4"
                    >
                      <CheckCircle2
                        size={20}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-brand-600"
                      />
                      <span className="font-medium">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {service.applicationType === 'company-registration' ? (
              <CostEstimator locale={locale} className="mt-12" />
            ) : null}

            {requirements.length > 0 ? (
              <div className="mt-12 rounded-xl border border-border-soft bg-surface-sunken p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-tint text-text-brand">
                    <ClipboardList size={22} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-h3">{t('services.requirementsTitle')}</h2>
                    <ol className="mt-4 list-none space-y-2.5 p-0">
                      {requirements.map((item, index) => (
                        <li key={item.id ?? index} className="flex items-start gap-3">
                          <span className="ltr-nums mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-tint text-eyebrow font-bold text-text-brand">
                            {index + 1}
                          </span>
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 text-caption text-text-muted">
                      {t('services.documentsNote')}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {faqs.length > 0 ? (
              <div className="mt-12">
                <h2 className="text-h3">{t('services.faqTitle')}</h2>
                <Accordion items={faqs} className="mt-5" />
              </div>
            ) : null}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
            {applyHref ? (
              <div className="relative isolate overflow-hidden rounded-xl bg-gradient-deep p-6 text-white shadow-float">
                <div
                  className="absolute inset-0 -z-10 bg-dots-inverse opacity-30"
                  aria-hidden="true"
                />
                {hasPrice(service) ? (
                  <PriceTag service={service} locale={locale} size="lg" inverse />
                ) : (
                  <p className="text-h3 text-white">{t('services.noPrice')}</p>
                )}
                <p className="mt-2 text-caption text-brand-100">
                  {hasPrice(service) ? t('services.priceNote') : t('services.applicationLead')}
                </p>
                <ButtonLink href={applyHref} variant="inverse" size="lg" className="mt-5 w-full">
                  {t('services.startApplication')}
                  <Arrow size={18} strokeWidth={2} aria-hidden="true" />
                </ButtonLink>
                {hasPrice(service) ? (
                  <p className="mt-3 text-center text-caption text-brand-100">
                    {t('services.applicationLead')}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div
              id="service-enquiry"
              aria-labelledby="service-enquiry-heading"
              className="scroll-mt-28 rounded-xl border border-border-soft bg-surface p-6 shadow-card"
            >
              <h2 id="service-enquiry-heading" className="text-h3">
                {t('services.enquireAbout', { service: service.title })}
              </h2>
              <p className="mt-2 text-caption text-text-muted">{t('contact.formLead')}</p>
              <div className="mt-5">
                <EnquiryFormSection locale={locale} compact defaultService={service.id} />
              </div>
            </div>

            {others.length > 0 ? (
              <nav
                aria-labelledby="other-services-heading"
                className="rounded-xl border border-border-soft bg-surface-sunken p-6"
              >
                <h2
                  id="other-services-heading"
                  className="text-caption font-bold tracking-[0.14em] text-text-brand uppercase"
                >
                  {t('services.otherServices')}
                </h2>
                <ul className="mt-4 list-none divide-y divide-border-soft p-0">
                  {others.map((entry) => (
                    <li key={entry.id}>
                      <Link
                        href={`/services/${entry.slug}`}
                        className="group flex items-center gap-3 py-3 text-text no-underline hover:text-text-brand"
                      >
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface-tint text-text-brand">
                          <ServiceIcon name={entry.icon} size={18} />
                        </span>
                        <span className="flex-1 font-medium">{entry.title}</span>
                        <Arrow
                          size={16}
                          strokeWidth={2}
                          aria-hidden="true"
                          className="text-border-strong transition-transform group-hover:translate-x-0.5 group-hover:text-text-brand rtl:group-hover:-translate-x-0.5"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </aside>
        </div>
      </Container>
    </>
  )
}
