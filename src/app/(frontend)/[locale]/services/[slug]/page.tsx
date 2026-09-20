import { CheckCircle2 } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import { RichText } from '@/components/RichText'
import { ServiceIcon } from '@/components/ServiceIcon'
import { EnquiryFormSection } from '@/components/forms/EnquiryFormSection'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Link } from '@/i18n/navigation'
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld'
import { getServiceBySlug, getSiteSettings } from '@/lib/queries'
import { buildMetadata, mediaUrl } from '@/lib/seo'

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

export default async function ServicePage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const service = await getServiceBySlug(slug, locale)
  if (!service) notFound()

  const [t, settings] = await Promise.all([getTranslations({ locale }), getSiteSettings(locale)])

  const image = typeof service.image === 'object' ? (service.image as Media) : null
  const heroSrc = mediaUrl(image, 'hero')
  const faqs = (service.faqs ?? []).map((item) => ({
    question: item.question,
    answer: item.answer,
  }))

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

      <section className="relative isolate overflow-hidden bg-[var(--brand-900)] py-16 text-[var(--text-on-inverse)] md:py-20">
        {heroSrc ? (
          <>
            <Image
              src={heroSrc}
              alt={image?.alt ?? ''}
              fill
              priority
              sizes="100vw"
              className="-z-20 object-cover"
            />
            <div className="absolute inset-0 -z-10 bg-[var(--overlay-photo)]" aria-hidden="true" />
          </>
        ) : null}
        <Container>
          <nav aria-label={t('a11y.breadcrumb')} className="mb-5 text-caption">
            <ol className="flex list-none flex-wrap gap-2 p-0 text-[var(--brand-300)]">
              <li>
                <Link href="/" className="text-[var(--brand-300)] no-underline hover:text-white">
                  {t('nav.home')}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href="/services"
                  className="text-[var(--brand-300)] no-underline hover:text-white"
                >
                  {t('services.title')}
                </Link>
              </li>
            </ol>
          </nav>

          <div className="max-w-[46rem]">
            <span className="mb-4 inline-flex size-14 items-center justify-center rounded-[var(--radius)] bg-white/15 text-white">
              <ServiceIcon name={service.icon} size={30} />
            </span>
            <h1 className="text-h1 text-white">{service.title}</h1>
            <p className="mt-4 text-body-lg text-[var(--brand-100)]">{service.summary}</p>
          </div>
        </Container>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
          <div>
            <RichText data={service.body} />

            {service.highlights && service.highlights.length > 0 ? (
              <ul className="mt-10 grid list-none gap-3 p-0 sm:grid-cols-2">
                {service.highlights.map((item, index) => (
                  <li key={item.id ?? index} className="flex items-start gap-2">
                    <CheckCircle2
                      size={20}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-[var(--brand-700)]"
                    />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {faqs.length > 0 ? (
              <div className="mt-12 max-w-[var(--measure)]">
                <h2>{t('services.otherServices')}</h2>
                {faqs.map((item, index) => (
                  <details
                    key={index}
                    className="border-b border-[var(--border)] py-4 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="cursor-pointer list-none text-body-lg font-semibold text-[var(--heading)]">
                      {item.question}
                    </summary>
                    <p className="mt-3 text-[var(--text-muted)]">{item.answer}</p>
                  </details>
                ))}
              </div>
            ) : null}
          </div>

          <aside
            aria-labelledby="service-enquiry-heading"
            className="h-fit rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-sunken)] p-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]"
          >
            <h2 id="service-enquiry-heading" className="text-h3">
              {t('services.enquireAbout', { service: service.title })}
            </h2>
            <div className="mt-5">
              <EnquiryFormSection locale={locale} compact />
            </div>
          </aside>
        </div>
      </Section>
    </>
  )
}
