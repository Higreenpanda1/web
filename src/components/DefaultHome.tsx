import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { ContactPanel } from '@/components/home/ContactPanel'
import { FounderCard } from '@/components/home/FounderCard'
import { Hero } from '@/components/home/Hero'
import { ProcessSteps } from '@/components/home/ProcessSteps'
import { StatsBand } from '@/components/home/StatsBand'
import { PostCard } from '@/components/PostCard'
import { ServiceCard } from '@/components/ServiceCard'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getFounder, getPosts, getServices, getSiteSettings } from '@/lib/queries'

import type { Locale } from '@/i18n/routing'

/**
 * The homepage as it renders before anyone has touched the CMS.
 *
 * Every word comes from the message catalogues, which were written Arabic-first
 * from the brief's own copy. Once an editor builds a `home` Page in the CMS,
 * that layout replaces this entirely — and the blocks it is made of share
 * these same section components, so the two never look different.
 */
export async function DefaultHome({ locale }: { locale: Locale }) {
  const [t, settings, services, { docs: posts }, founder] = await Promise.all([
    getTranslations({ locale }),
    getSiteSettings(locale),
    getServices(locale, { limit: 9 }),
    getPosts(locale, { limit: 3 }),
    getFounder(locale),
  ])

  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight
  const steps = ([1, 2, 3, 4] as const).map((step) => ({
    title: t(`home.process.step${step}Title` as 'home.process.step1Title'),
    body: t(`home.process.step${step}Body` as 'home.process.step1Body'),
  }))

  return (
    <>
      <Hero locale={locale} settings={settings} />

      <div className="bg-surface pb-4">
        <Container>
          <StatsBand
            eyebrow={t('home.statsEyebrow')}
            heading={t('home.statsTitle')}
            items={[
              { value: '235+', label: t('home.stats.cities') },
              { value: '100+', label: t('home.stats.fairs') },
              { value: '46,000', label: t('home.stats.followers') },
              { value: '29,000', label: t('home.stats.subscribers') },
            ]}
          />
        </Container>
      </div>

      {services.length > 0 ? (
        <Section tone="sunken" labelledBy="home-services-heading">
          <SectionHeading
            id="home-services-heading"
            eyebrow={t('home.servicesEyebrow')}
            title={t('home.servicesTitle')}
            lead={t('home.servicesLead')}
            action={
              <ButtonLink href="/services" variant="secondary">
                {t('cta.allServices')}
                <Arrow size={18} strokeWidth={2} aria-hidden="true" />
              </ButtonLink>
            }
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

      <Section labelledBy="home-process-heading">
        <SectionHeading
          id="home-process-heading"
          eyebrow={t('home.processEyebrow')}
          title={t('home.processTitle')}
          lead={t('home.processLead')}
        />
        <ProcessSteps steps={steps} />
      </Section>

      {founder ? (
        <Section tone="tint" labelledBy="home-founder-heading">
          <FounderCard
            member={founder}
            eyebrow={t('home.founderEyebrow')}
            heading={t('home.founderTitle')}
            actions={
              <ButtonLink href="/about" variant="secondary">
                {t('home.founderCta')}
                <Arrow size={18} strokeWidth={2} aria-hidden="true" />
              </ButtonLink>
            }
          />
          <h2 id="home-founder-heading" className="sr-only">
            {t('home.founderTitle')}
          </h2>
        </Section>
      ) : null}

      {posts.length > 0 ? (
        <Section tone="sunken" labelledBy="home-blog-heading">
          <SectionHeading
            id="home-blog-heading"
            eyebrow={t('home.blogEyebrow')}
            title={t('home.blogTitle')}
            lead={t('home.blogLead')}
            action={
              <ButtonLink href="/blog" variant="secondary">
                {t('blog.title')}
                <Arrow size={18} strokeWidth={2} aria-hidden="true" />
              </ButtonLink>
            }
          />
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} locale={locale} />
            ))}
          </ul>
        </Section>
      ) : null}

      <Section labelledBy="home-contact-heading" className="pt-4 md:pt-8">
        <ContactPanel
          id="enquire"
          locale={locale}
          settings={settings}
          eyebrow={t('home.contactEyebrow')}
          heading={t('home.contactTitle')}
          lead={t('home.contactLead')}
        />
        <h2 id="home-contact-heading" className="sr-only">
          {t('home.contactTitle')}
        </h2>
      </Section>
    </>
  )
}
