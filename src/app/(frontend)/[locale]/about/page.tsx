import { Handshake, MapPinned, MessageSquareText, Receipt } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

import { ContactPanel } from '@/components/home/ContactPanel'
import { FounderCard } from '@/components/home/FounderCard'
import { StatsBand } from '@/components/home/StatsBand'
import { JsonLd } from '@/components/JsonLd'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { PageHero } from '@/components/ui/PageHero'
import { Section, SectionHeading } from '@/components/ui/Section'
import { breadcrumbJsonLd, organisationJsonLd } from '@/lib/jsonld'
import { getSiteSettings, getTeam } from '@/lib/queries'
import { buildMetadata, mediaSrc } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Media } from '@/payload-types'
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
              <span className="inline-flex size-12 items-center justify-center rounded-lg bg-surface-tint text-brand-700">
                <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="mt-5">{title}</h3>
              <p className="mt-2 text-text-muted">{body}</p>
            </Card>
          ))}
        </ul>
      </Section>

      {others.length > 0 ? (
        <Section tone="sunken" labelledBy="team-heading">
          <SectionHeading id="team-heading" title={t('about.teamTitle')} />
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((member) => {
              const photo = typeof member.photo === 'object' ? (member.photo as Media) : null
              const src = mediaSrc(photo, 'thumbnail')
              return (
                <Card as="li" key={member.id}>
                  {src ? (
                    <Image
                      src={src}
                      alt={photo?.alt ?? member.name}
                      width={320}
                      height={320}
                      sizes="320px"
                      className="mb-4 size-20 rounded-full object-cover"
                    />
                  ) : null}
                  <h3>{member.name}</h3>
                  <p className="text-text-muted">{member.role}</p>
                  {member.bio ? <p className="mt-3">{member.bio}</p> : null}
                </Card>
              )
            })}
          </ul>
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
