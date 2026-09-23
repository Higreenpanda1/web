import { CheckCircle2 } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { ApplicationForm } from '@/components/forms/ApplicationForm'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { JsonLd } from '@/components/JsonLd'
import { ServiceIcon } from '@/components/ServiceIcon'
import { PriceTag } from '@/components/services/PriceTag'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { PageHero } from '@/components/ui/PageHero'
import { Link } from '@/i18n/navigation'
import { APPLICATION_TYPES, isApplicationType } from '@/lib/catalogue'
import { issueFormToken } from '@/lib/form-guard'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getServiceBySlug, getServices, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { whatsappLink } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'

type Params = Promise<{ locale: Locale; type: string }>
type Search = Promise<{ service?: string }>

export function generateStaticParams() {
  return APPLICATION_TYPES.map((type) => ({ type }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, type } = await params
  if (!isApplicationType(type)) return {}
  const t = await getTranslations({ locale })
  return buildMetadata({
    locale,
    path: `/apply/${type}`,
    title: t(`apply.types.${type}.title`),
    description: t(`apply.types.${type}.lead`),
    // Forms are for people who already found the service page; keep the
    // service page as the thing search engines rank.
    seo: { noindex: true },
  })
}

/**
 * /apply/<type>[?service=slug]. The form takes the whole width on a phone and
 * two thirds on a desktop, with a quiet aside that says what happens next and
 * repeats the service's "have these ready" list — the answer to the question
 * every visitor has halfway through a form: "why are you asking me this?"
 */
export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}) {
  const [{ locale, type }, { service: serviceSlug }] = await Promise.all([params, searchParams])
  if (!isApplicationType(type)) notFound()
  setRequestLocale(locale)
  // The token must be minted per request, never baked into a static page.
  await connection()

  const [t, settings, service] = await Promise.all([
    getTranslations({ locale }),
    getSiteSettings(locale),
    serviceSlug ? getServiceBySlug(serviceSlug, locale) : serviceForType(type, locale),
  ])

  const requirements = service?.requirements ?? []
  const whatsapp = whatsappLink(
    settings.whatsappNumber,
    service
      ? t('services.enquireAbout', { service: service.title })
      : (settings.whatsappPrefill ?? undefined),
  )

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('services.title'), path: '/services' },
          ...(service ? [{ name: service.title, path: `/services/${service.slug}` }] : []),
          { name: t(`apply.types.${type}.title`), path: `/apply/${type}` },
        ])}
      />

      <PageHero
        eyebrow={t('apply.eyebrow')}
        title={t(`apply.types.${type}.title`)}
        lead={t(`apply.types.${type}.lead`)}
        icon={service ? <ServiceIcon name={service.icon} size={30} /> : undefined}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[
              { name: t('nav.home'), href: '/' },
              { name: t('services.title'), href: '/services' },
              ...(service ? [{ name: service.title, href: `/services/${service.slug}` }] : []),
              { name: t(`apply.types.${type}.title`) },
            ]}
          />
        }
      >
        {service ? (
          <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-border-soft bg-surface px-4 py-2 text-caption shadow-sm">
            <span className="text-text-muted">{t('apply.forService', { service: '' }).trim()}</span>
            <Link href={`/services/${service.slug}`} className="font-semibold">
              {service.title}
            </Link>
            <PriceTag service={service} locale={locale} size="sm" />
          </p>
        ) : null}
      </PageHero>

      <Container className="py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
          <div className="min-w-0 rounded-xl border border-border-soft bg-surface p-6 shadow-card md:p-8">
            <ApplicationForm
              locale={locale}
              type={type}
              formToken={issueFormToken()}
              serviceId={service?.id ?? null}
            />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
            <section
              aria-labelledby="apply-next-heading"
              className="rounded-xl border border-border-soft bg-surface-sunken p-6"
            >
              <h2
                id="apply-next-heading"
                className="text-caption font-bold tracking-[0.14em] text-text-brand uppercase"
              >
                {t('apply.aside.nextTitle')}
              </h2>
              <ol className="mt-4 list-none space-y-3 p-0">
                {(['step1', 'step2', 'step3'] as const).map((key, index) => (
                  <li key={key} className="flex gap-3">
                    <span className="ltr-nums inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-caption font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 text-text-muted">{t(`apply.aside.${key}`)}</span>
                  </li>
                ))}
              </ol>
            </section>

            {requirements.length > 0 ? (
              <section
                aria-labelledby="apply-requirements-heading"
                className="rounded-xl border border-border-soft bg-surface-tint-soft p-6"
              >
                <h2
                  id="apply-requirements-heading"
                  className="text-caption font-bold tracking-[0.14em] text-text-brand uppercase"
                >
                  {t('apply.aside.requirementsTitle')}
                </h2>
                <ul className="mt-4 list-none space-y-2.5 p-0">
                  {requirements.map((item, index) => (
                    <li key={item.id ?? index} className="flex items-start gap-2.5">
                      <CheckCircle2
                        size={18}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-brand-600"
                      />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-caption text-text-muted">{t('services.documentsNote')}</p>
              </section>
            ) : null}

            <section
              aria-labelledby="apply-help-heading"
              className="relative isolate overflow-hidden rounded-xl bg-gradient-deep p-6 text-white"
            >
              <div
                className="absolute inset-0 -z-10 bg-dots-inverse opacity-40"
                aria-hidden="true"
              />
              <h2 id="apply-help-heading" className="text-h3 text-white">
                {t('apply.aside.helpTitle')}
              </h2>
              <p className="mt-2 text-brand-100">{t('apply.aside.helpBody')}</p>
              <ButtonLink href={whatsapp} variant="inverse" className="mt-5 w-full">
                <WhatsAppIcon size={20} className="text-brand-700" />
                {t('cta.whatsapp')}
              </ButtonLink>
            </section>
          </aside>
        </div>
      </Container>
    </>
  )
}

/** The first published service that uses this form, for context when none was named. */
async function serviceForType(type: string, locale: Locale) {
  const services = await getServices(locale, { limit: 60 })
  return services.find((service) => service.applicationType === type) ?? null
}
