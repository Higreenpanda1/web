import { CheckCircle2 } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { headers } from 'next/headers'
import Image from 'next/image'

import { JsonLd } from '@/components/JsonLd'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { Section, SectionHeading } from '@/components/ui/Section'
import { breadcrumbJsonLd, organisationJsonLd } from '@/lib/jsonld'
import { getSiteSettings, getTeam } from '@/lib/queries'
import { buildMetadata, mediaUrl } from '@/lib/seo'

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

  const [t, team, settings, headerList] = await Promise.all([
    getTranslations({ locale }),
    getTeam(locale),
    getSiteSettings(locale),
    headers(),
  ])
  const nonce = headerList.get('x-nonce') ?? undefined

  const founder = team.find((member) => member.isFounder) ?? team[0] ?? null
  const others = team.filter((member) => member.id !== founder?.id)
  const founderPhoto = founder && typeof founder.photo === 'object' ? (founder.photo as Media) : null
  const founderSrc = mediaUrl(founderPhoto, 'card')

  return (
    <>
      <JsonLd nonce={nonce} data={organisationJsonLd(settings, locale)} />
      <JsonLd
        nonce={nonce}
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('about.title'), path: '/about' },
        ])}
      />

      <Container as="header" className="py-14 md:py-20">
        <div className="max-w-[var(--measure)]">
          <h1 className="text-h1">{t('about.title')}</h1>
          <p className="mt-5 text-body-lg text-[var(--text-muted)]">{t('about.lead')}</p>
        </div>
      </Container>

      {founder ? (
        <Section tone="tint" labelledBy="founder-heading">
          <div className="grid items-start gap-10 md:grid-cols-[minmax(0,18rem)_1fr]">
            {founderSrc ? (
              <Image
                src={founderSrc}
                alt={founderPhoto?.alt ?? founder.name}
                width={768}
                height={768}
                sizes="(min-width: 768px) 18rem, 100vw"
                className="aspect-square rounded-[var(--radius-lg)] object-cover"
              />
            ) : null}

            <div>
              <h2 id="founder-heading">{t('about.founderTitle')}</h2>
              <p className="mt-3 text-h3 font-semibold text-[var(--heading)]">{founder.name}</p>
              <p className="text-[var(--text-muted)]">{founder.role}</p>
              {founder.bio ? (
                <p className="mt-4 max-w-[var(--measure)] text-body-lg">{founder.bio}</p>
              ) : null}

              {founder.credentials && founder.credentials.length > 0 ? (
                <ul className="mt-6 grid list-none gap-2 p-0 sm:grid-cols-2">
                  {founder.credentials.map((item, index) => (
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
            </div>
          </div>
        </Section>
      ) : null}

      {others.length > 0 ? (
        <Section labelledBy="team-heading">
          <SectionHeading id="team-heading" title={t('about.teamTitle')} />
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((member) => {
              const photo = typeof member.photo === 'object' ? (member.photo as Media) : null
              const src = mediaUrl(photo, 'thumbnail')
              return (
                <Card as="li" key={member.id}>
                  {src ? (
                    <Image
                      src={src}
                      alt={photo?.alt ?? member.name}
                      width={320}
                      height={320}
                      sizes="320px"
                      className="mb-4 size-20 rounded-[var(--radius-full)] object-cover"
                    />
                  ) : null}
                  <h3 className="text-h3">{member.name}</h3>
                  <p className="text-[var(--text-muted)]">{member.role}</p>
                  {member.bio ? <p className="mt-3">{member.bio}</p> : null}
                </Card>
              )
            })}
          </ul>
        </Section>
      ) : null}

      <Section tone="inverse">
        <div className="max-w-[var(--measure)]">
          <h2 className="text-white">{t('about.contactTitle')}</h2>
          <p className="mt-4 text-body-lg text-[var(--brand-100)]">{t('contact.lead')}</p>
          <ButtonLink href="/contact" size="lg" variant="inverse" className="mt-7">
            {t('cta.enquire')}
          </ButtonLink>
        </div>
      </Section>
    </>
  )
}
