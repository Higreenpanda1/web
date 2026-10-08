import { BadgeCheck, Building2, Calculator, FileCheck2, MapPin } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

import { JsonLd } from '@/components/JsonLd'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Card } from '@/components/ui/Card'
import { PageHero } from '@/components/ui/PageHero'
import { Section, SectionHeading } from '@/components/ui/Section'
import { HEADQUARTERS, LICENCES } from '@/lib/company'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Licence } from '@/lib/company'
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
    path: '/licences',
    title: t('licences.title'),
    description: t('licences.lead'),
  })
}

const ICONS = { guangzhou: Building2, nasher: FileCheck2, accounting: Calculator } as const

/**
 * Proof that the business is real: each licence and the head-office address
 * in its own section, in the order the owner asked for. The facts come from
 * src/lib/company.ts; this page only lays them out.
 */
export default async function LicencesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale })

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('licences.title'), path: '/licences' },
        ])}
      />

      <PageHero
        eyebrow={t('licences.eyebrow')}
        title={t('licences.title')}
        lead={t('licences.lead')}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[{ name: t('nav.home'), href: '/' }, { name: t('licences.title') }]}
          />
        }
      />

      {LICENCES.map((licence, index) => (
        <LicenceSection
          key={licence.id}
          licence={licence}
          tone={index % 2 === 0 ? 'default' : 'tint'}
          t={t}
        />
      ))}

      <Section id="headquarters" tone="sunken" labelledBy="hq-heading">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <SectionHeading
            id="hq-heading"
            eyebrow={t('licences.hq.eyebrow')}
            title={t('licences.hq.title')}
            lead={t('licences.hq.lead')}
          />
          <div className="w-full max-w-md space-y-6">
            {HEADQUARTERS.photo ? (
              <figure>
                <Image
                  src={HEADQUARTERS.photo}
                  alt={t('licences.hq.photoAlt')}
                  width={989}
                  height={1318}
                  sizes="448px"
                  className="aspect-[4/5] h-auto w-full rounded-lg border border-border-soft object-cover shadow-card"
                />
                {HEADQUARTERS.photoCredit ? (
                  <figcaption className="mt-2 text-caption text-text-muted" dir="ltr">
                    {HEADQUARTERS.photoCredit}
                  </figcaption>
                ) : null}
              </figure>
            ) : null}
            <Card>
              <div className="flex items-start gap-4">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-tint text-text-brand">
                  <MapPin size={24} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3>{t('licences.hq.city')}</h3>
                  {HEADQUARTERS.addressEn ? (
                    <address className="mt-2 not-italic" lang="en">
                      {HEADQUARTERS.addressEn.map((line) => (
                        <bdi key={line} className="block">
                          {line}
                        </bdi>
                      ))}
                    </address>
                  ) : (
                    <p className="mt-2 text-text-muted">{t('licences.hq.onRequest')}</p>
                  )}
                  {HEADQUARTERS.addressZh ? (
                    <p className="mt-2 text-text-muted" lang="zh">
                      {HEADQUARTERS.addressZh}
                    </p>
                  ) : null}
                  {HEADQUARTERS.mapUrl ? (
                    <a
                      href={HEADQUARTERS.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 font-semibold"
                    >
                      <MapPin size={18} strokeWidth={1.75} aria-hidden="true" />
                      {t('licences.hq.openMap')}
                    </a>
                  ) : null}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Section>
    </>
  )
}

function LicenceSection({
  licence,
  tone,
  t,
}: {
  licence: Licence
  tone: 'default' | 'tint'
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  const Icon = ICONS[licence.id]
  const headingId = `${licence.id}-heading`
  return (
    <Section id={licence.id} tone={tone} labelledBy={headingId}>
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div>
          <span className="inline-flex size-12 items-center justify-center rounded-lg bg-surface-tint text-text-brand">
            <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h2 id={headingId} className="mt-5">
            {t(`licences.items.${licence.id}.title`)}
          </h2>
          <p className="mt-3 text-body-lg text-text-muted">
            {t(`licences.items.${licence.id}.body`)}
          </p>
          <dl className="mt-6 space-y-3">
            <div>
              <dt className="text-caption text-text-muted">
                {t(licence.id === 'accounting' ? 'licences.holder' : 'licences.legalName')}
              </dt>
              <dd className="font-semibold">
                <bdi lang="en">{licence.legalName}</bdi>
              </dd>
              {licence.chineseName ? <dd lang="zh">{licence.chineseName}</dd> : null}
            </div>
            <div>
              <dt className="text-caption text-text-muted">{t('licences.issuedIn')}</dt>
              <dd>{t(`licences.items.${licence.id}.city`)}</dd>
            </div>
            {licence.number ? (
              <div>
                <dt className="text-caption text-text-muted">{t('licences.number')}</dt>
                <dd className="font-semibold">
                  <bdi className="ltr-nums">{licence.number}</bdi>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {licence.images.length > 0 ? (
          <div className="space-y-6">
            {licence.images.map((image) => (
              <figure key={image.src}>
                <a href={image.src} target="_blank" rel="noopener noreferrer" className="block">
                  <Image
                    src={image.src}
                    alt={t(`licences.docs.${image.label}`)}
                    width={image.width}
                    height={image.height}
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="h-auto w-full rounded-lg border border-border-soft shadow-card"
                  />
                </a>
                <figcaption className="mt-2 text-caption text-text-muted">
                  {t(`licences.docs.${image.label}`)} · {t('licences.viewFull')}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <Card className="flex items-center gap-3">
            <BadgeCheck
              size={24}
              strokeWidth={1.75}
              className="text-text-brand"
              aria-hidden="true"
            />
            <p>{t('licences.onRequest')}</p>
          </Card>
        )}
      </div>
    </Section>
  )
}
