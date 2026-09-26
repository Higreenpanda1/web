import { Handshake, MapPinned, MessageSquareText, Receipt } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Licences } from '@/components/about/Licences'
import { TeamMemberCard } from '@/components/about/TeamMemberCard'
import { Timeline } from '@/components/about/Timeline'
import { ContactPanel } from '@/components/home/ContactPanel'
import { FounderCard } from '@/components/home/FounderCard'
import { StatsBand } from '@/components/home/StatsBand'
import { JsonLd } from '@/components/JsonLd'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { PageHero } from '@/components/ui/PageHero'
import { Section, SectionHeading } from '@/components/ui/Section'
import { breadcrumbJsonLd, organisationJsonLd, personJsonLd } from '@/lib/jsonld'
import { getSiteSettings, getTeam } from '@/lib/queries'
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
    path: '/about',
    title: t('about.title'),
    description: t('about.lead'),
  })
}

/**
 * The founder page the brief asks for. "The audience follows the person, not
 * just the company" (section 3) — 46K on Instagram, 29K on YouTube — and the
 * old site under-used that badly. Everything here comes from the TeamMembers
 * collection so the client can keep it current.
 */
export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, team, settings] = await Promise.all([
    getTranslations({ locale }),
    getTeam(locale),
    getSiteSettings(locale),
  ])

  const founder = team.find((member) => member.isFounder) ?? team[0] ?? null
  const others = team.filter((member) => member.id !== founder?.id)
  const left = others.slice(0, Math.ceil(others.length / 2))
  const right = others.slice(left.length)

  // The brand personality table (brief section 10), as the four things a
  // visitor can hold us to.
  const values = [
    { Icon: MapPinned, title: t('home.process.step3Title'), body: t('home.process.step3Body') },
    {
      Icon: MessageSquareText,
      title: t('home.process.step1Title'),
      body: t('home.process.step1Body'),
    },
    { Icon: Receipt, title: t('home.process.step2Title'), body: t('home.process.step2Body') },
    { Icon: Handshake, title: t('home.process.step4Title'), body: t('home.process.step4Body') },
  ]

  return (
    <>
      <JsonLd data={organisationJsonLd(settings, locale)} />
      {founder ? (
        <JsonLd
          data={{ '@context': 'https://schema.org', ...personJsonLd(founder, locale, settings) }}
        />
      ) : null}
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('about.title'), path: '/about' },
        ])}
      />

      <PageHero
        eyebrow={t('about.eyebrow')}
        title={t('about.title')}
        lead={t('about.lead')}
        size="lg"
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[{ name: t('nav.home'), href: '/' }, { name: t('about.title') }]}
          />
        }
      />

      <div className="bg-surface pb-4">
        <Container>
          <StatsBand
            items={[
              { value: '235+', label: t('home.stats.cities') },
              { value: '100+', label: t('home.stats.fairs') },
              { value: '46,000', label: t('home.stats.followers') },
              { value: '29,000', label: t('home.stats.subscribers') },
            ]}
          />
        </Container>
      </div>

      {founder ? (
        <Section tone="tint" labelledBy="founder-heading">
          <FounderCard
            member={founder}
            eyebrow={t('about.founderTitle')}
            heading={t('home.founderTitle')}
          />
          <h2 id="founder-heading" className="sr-only">
            {t('about.founderTitle')}
          </h2>
        </Section>
      ) : null}

      {founder?.timeline && founder.timeline.length > 0 ? (
        <Section labelledBy="journey-heading">
          <SectionHeading
            id="journey-heading"
            eyebrow={t('about.journeyEyebrow')}
            title={t('about.journeyTitle')}
            lead={t('about.journeyLead')}
          />
          <Timeline items={founder.timeline} locale={locale} className="mx-auto max-w-4xl" />
        </Section>
      ) : null}

      <Section labelledBy="values-heading">
        <SectionHeading
          id="values-heading"
          eyebrow={t('home.processEyebrow')}
          title={t('about.valuesTitle')}
          lead={t('about.valuesLead')}
        />
        <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ Icon, title, body }) => (
            <Card as="li" key={title}>
              <span className="inline-flex size-12 items-center justify-center rounded-lg bg-surface-tint text-text-brand">
                <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="mt-5">{title}</h3>
              <p className="mt-2 text-text-muted">{body}</p>
            </Card>
          ))}
        </ul>
      </Section>

      {settings.licences && settings.licences.length > 0 ? (
        <Section tone="sunken" labelledBy="licences-heading">
          <SectionHeading
            id="licences-heading"
            eyebrow={t('about.licencesEyebrow')}
            title={t('about.licencesTitle')}
            lead={t('about.licencesLead')}
          />
          <Licences items={settings.licences} locale={locale} />
        </Section>
      ) : null}

      {founder && others.length > 0 ? (
        <Section labelledBy="team-heading">
          <SectionHeading id="team-heading" title={t('about.teamTitle')} align="center" />
          {/* The owner's team sheet: the founder in the middle, the team split
              either side of him in order. On a phone it is one column, founder
              first. */}
          <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr_1fr] lg:items-center">
            <TeamMemberCard member={founder} featured className="lg:col-start-2 lg:row-start-1" />
            <ul className="grid list-none grid-cols-2 gap-4 p-0 sm:gap-5 lg:col-start-1 lg:row-start-1 lg:grid-cols-1">
              {left.map((member) => (
                <TeamMemberCard key={member.id} as="li" member={member} />
              ))}
            </ul>
            <ul className="grid list-none grid-cols-2 gap-4 p-0 sm:gap-5 lg:col-start-3 lg:row-start-1 lg:grid-cols-1">
              {right.map((member) => (
                <TeamMemberCard key={member.id} as="li" member={member} />
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      <Section className="pt-0 md:pt-0">
        <ContactPanel
          locale={locale}
          settings={settings}
          eyebrow={t('home.contactEyebrow')}
          heading={t('about.contactTitle')}
          lead={t('contact.lead')}
        />
      </Section>
    </>
  )
}
