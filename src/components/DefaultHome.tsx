import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { ContactPanel } from '@/components/home/ContactPanel'
import { FounderCard } from '@/components/home/FounderCard'
import { Hero } from '@/components/home/Hero'
import { Journey, type JourneyStep } from '@/components/home/Journey'
import { LatestVideos } from '@/components/home/LatestVideos'
import { PostCard } from '@/components/PostCard'
import { CategoryTiles } from '@/components/services/CategoryTiles'
import { ButtonLink } from '@/components/ui/Button'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getFounder, getPosts, getServices, getSiteSettings } from '@/lib/queries'
import { groupServices } from '@/lib/services'

import type { Locale } from '@/i18n/routing'

/**
 * Where each of the twelve steps sends the visitor. Services by slug; the
 * two steps that are conversations rather than services go to the
 * consultation form.
 */
const JOURNEY_LINKS = [
  '/apply/consultation',
  '/apply/consultation',
  '/services/trademark-registration',
  '/services/company-formation',
  '/services/work-visa-and-residence',
  '/services/accounting-and-tax',
  '/services/product-sourcing',
  '/services/quality-inspection',
  '/services/shipping-and-freight',
  '/services/shipping-and-freight',
  '/services/shipping-and-freight',
  '/services/full-import-management',
] as const

/**
 * The homepage as it renders before anyone has touched the CMS.
 *
 * Rebuilt on 23 September 2026 around the owner's structure document: a
 * quieter hero, the twelve-step journey as the centrepiece, the consultation
 * offer, then the service areas, the blog and the founder. One accent colour,
 * white surfaces, and motion only on entrance. Every word comes from the
 * message catalogues; a CMS `home` Page still replaces all of this.
 */
export async function DefaultHome({ locale }: { locale: Locale }) {
  const [t, settings, services, { docs: posts }, founder] = await Promise.all([
    getTranslations({ locale }),
    getSiteSettings(locale),
    getServices(locale, { limit: 60 }),
    getPosts(locale, { limit: 3 }),
    getFounder(locale),
  ])

  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight
  const groups = groupServices(services)
  const steps: JourneyStep[] = JOURNEY_LINKS.map((href, index) => ({
    href,
    title: t(`home.journeySteps.${index + 1}.title` as 'home.journeySteps.1.title'),
    body: t(`home.journeySteps.${index + 1}.body` as 'home.journeySteps.1.body'),
    linkLabel: href.startsWith('/apply') ? t('cta.bookConsultation') : t('cta.seeService'),
  }))

  return (
    <>
      <ScrollReveal />
      <Hero locale={locale} settings={settings} />

      <Section id="journey" labelledBy="home-journey-heading" className="scroll-mt-20">
        <SectionHeading
          id="home-journey-heading"
          eyebrow={t('home.journeyEyebrow')}
          title={t('home.journeyTitle')}
          lead={t('home.journeyLead')}
          align="center"
        />
        <Journey steps={steps} locale={locale} stepLabel={t('home.journeyStep')} />
      </Section>

      <Section tone="sunken" labelledBy="home-consult-heading" className="py-12 md:py-16">
        <div
          data-reveal
          className="grid items-center gap-8 rounded-2xl border border-border-soft bg-surface p-6 shadow-card md:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14"
        >
          <div>
            <SectionHeading
              id="home-consult-heading"
              eyebrow={t('home.consultEyebrow')}
              title={t('home.consultTitle')}
              lead={t('home.consultLead')}
              className="mb-6 md:mb-6"
            />
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/apply/consultation" size="lg">
                {t('cta.bookConsultation')}
                <Arrow size={18} strokeWidth={2} aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-1">
            {(
              [
                ['consult30', 'consultPrice30'],
                ['consult60', 'consultPrice60'],
              ] as const
            ).map(([len, price]) => (
              <li
                key={len}
                className="flex items-center justify-between gap-4 rounded-lg border border-border-soft bg-surface-sunken px-5 py-4"
              >
                <span className="inline-flex items-center gap-2.5 font-semibold text-heading">
                  <Clock
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="text-text-brand"
                  />
                  {t(`home.${len}`)}
                </span>
                <span className="ltr-nums text-h3 font-bold text-heading">
                  {t(`home.${price}`)}
                </span>
              </li>
            ))}
            <li className="px-1 text-caption text-text-muted">{t('home.consultNote')}</li>
          </ul>
        </div>
      </Section>

      {groups.length > 1 ? (
        <Section labelledBy="home-services-heading">
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
          <CategoryTiles groups={groups} locale={locale} />
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

      {founder ? (
        <Section labelledBy="home-founder-heading">
          <div data-reveal>
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
          </div>
          <h2 id="home-founder-heading" className="sr-only">
            {t('home.founderTitle')}
          </h2>
        </Section>
      ) : null}

      <LatestVideos locale={locale} channelUrl={settings.social?.youtube} />

      <Section tone="sunken" labelledBy="home-contact-heading" className="pt-4 md:pt-8">
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
