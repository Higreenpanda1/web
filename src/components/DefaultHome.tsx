import { getTranslations } from 'next-intl/server'

import { EnquiryFormSection } from '@/components/forms/EnquiryFormSection'
import { PostCard } from '@/components/PostCard'
import { ServiceCard } from '@/components/ServiceCard'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getFounder, getPosts, getServices } from '@/lib/queries'

import type { Locale } from '@/i18n/routing'

/**
 * The homepage as it renders before anyone has touched the CMS.
 *
 * Every word comes from the message catalogues, which were written Arabic-first
 * from the brief's own copy — the hook in section 1 is used verbatim because it
 * states the customer's problem in their own words. Once an editor builds a
 * `home` Page in the CMS, that layout replaces this entirely.
 */
export async function DefaultHome({ locale }: { locale: Locale }) {
  const [t, services, { docs: posts }, founder] = await Promise.all([
    getTranslations({ locale }),
    getServices(locale, { limit: 9 }),
    getPosts(locale, { limit: 3 }),
    getFounder(locale),
  ])

  const steps = [1, 2, 3, 4] as const

  return (
    <>
      <section className="bg-[var(--brand-900)] py-16 text-[var(--text-on-inverse)] md:py-24">
        <Container>
          <div className="max-w-[46rem]">
            <p className="mb-3 text-caption font-semibold tracking-wide text-[var(--brand-300)] uppercase">
              {t('home.heroEyebrow')}
            </p>
            <h1 className="text-display text-balance text-white">{t('home.heroTitle')}</h1>
            <p className="mt-5 text-body-lg text-[var(--brand-100)]">{t('home.heroLead')}</p>
            <p className="mt-3 text-body-lg font-semibold text-[var(--brand-400)]">
              {t('home.heroPromise')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/contact" size="lg" variant="inverse">
                {t('cta.enquire')}
              </ButtonLink>
              <ButtonLink href="/services" size="lg" variant="outline-inverse">
                {t('cta.allServices')}
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* Numbers, in Western Arabic numerals in both locales. */}
      <Section tone="tint" labelledBy="stats-heading">
        <h2 id="stats-heading" className="mb-10">
          {t('home.statsTitle')}
        </h2>
        <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['235+', t('home.stats.cities')],
              ['100+', t('home.stats.fairs')],
              ['46,000', t('home.stats.followers')],
              ['29,000', t('home.stats.subscribers')],
            ] as const
          ).map(([value, label]) => (
            <div key={label}>
              <dt className="ltr-nums text-h1 font-bold text-[var(--brand-700)]">{value}</dt>
              <dd className="mt-1 text-body-lg text-[var(--text-muted)]">{label}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {services.length > 0 ? (
        <Section tone="sunken" labelledBy="home-services-heading">
          <SectionHeading
            id="home-services-heading"
            title={t('home.servicesTitle')}
            lead={t('home.servicesLead')}
          />
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
        </Section>
      ) : null}

      {/* The import process as a numbered flow — brief section 15. */}
      <Section labelledBy="home-process-heading">
        <SectionHeading
          id="home-process-heading"
          title={t('home.processTitle')}
          lead={t('home.processLead')}
        />
        <ol className="grid list-none gap-8 p-0 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step}>
              <span
                aria-hidden="true"
                className="ltr-nums mb-4 inline-flex size-12 items-center justify-center rounded-[var(--radius-full)] bg-[var(--brand-700)] text-h3 font-bold text-white"
              >
                {index + 1}
              </span>
              <h3 className="text-h3">
                {t(`home.process.step${step}Title` as 'home.process.step1Title')}
              </h3>
              <p className="mt-2 text-[var(--text-muted)]">
                {t(`home.process.step${step}Body` as 'home.process.step1Body')}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {founder ? (
        <Section tone="tint" labelledBy="home-founder-heading">
          <div className="max-w-[var(--measure)]">
            <h2 id="home-founder-heading">{t('home.founderTitle')}</h2>
            <p className="mt-3 text-h3 font-semibold text-[var(--heading)]">{founder.name}</p>
            <p className="text-[var(--text-muted)]">{founder.role}</p>
            {founder.bio ? <p className="mt-4 text-body-lg">{founder.bio}</p> : null}
            <ButtonLink href="/about" variant="secondary" className="mt-6">
              {t('home.founderCta')}
            </ButtonLink>
          </div>
        </Section>
      ) : null}

      {posts.length > 0 ? (
        <Section tone="sunken" labelledBy="home-blog-heading">
          <SectionHeading
            id="home-blog-heading"
            title={t('home.blogTitle')}
            lead={t('home.blogLead')}
          />
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} locale={locale} />
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="enquire" labelledBy="home-contact-heading">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="home-contact-heading">{t('home.contactTitle')}</h2>
            <p className="mt-4 max-w-[var(--measure)] text-body-lg text-[var(--text-muted)]">
              {t('home.contactLead')}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
            <EnquiryFormSection locale={locale} compact />
          </div>
        </div>
      </Section>
    </>
  )
}
