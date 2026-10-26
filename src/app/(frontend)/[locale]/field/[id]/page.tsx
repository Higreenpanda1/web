import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { ContactPanel } from '@/components/home/ContactPanel'
import { JsonLd } from '@/components/JsonLd'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { formatMonth } from '@/i18n/format'
import { Link } from '@/i18n/navigation'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getFieldMoment, getSiteSettings } from '@/lib/queries'
import { buildMetadata, mediaSrc } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Media } from '@/payload-types'
import type { Metadata } from 'next'

function visitId(raw: string): number | null {
  return /^\d+$/.test(raw) ? Number(raw) : null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>
}): Promise<Metadata> {
  const { locale, id: raw } = await params
  const id = visitId(raw)
  const moment = id ? await getFieldMoment(id, locale) : null
  if (!moment?.story) return {}
  const cover = typeof moment.photos?.[0] === 'object' ? (moment.photos[0] as Media) : null
  return buildMetadata({
    locale,
    path: `/field/${id}`,
    title: moment.title,
    description: moment.story.split('\n')[0] ?? moment.title,
    seo: { image: cover },
  })
}

/**
 * One visit told in full: what it was about, then every photo from it. Only
 * visits with a written story get a page; the rest stay as cards on /field.
 */
export default async function FieldVisitPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>
}) {
  const { locale, id: raw } = await params
  setRequestLocale(locale)
  const id = visitId(raw)
  if (!id) notFound()

  const [t, moment, settings] = await Promise.all([
    getTranslations({ locale }),
    getFieldMoment(id, locale),
    getSiteSettings(locale),
  ])
  if (!moment?.story) notFound()

  const photos = (moment.photos ?? []).filter(
    (photo): photo is Media => typeof photo === 'object' && photo !== null,
  )
  const paragraphs = moment.story
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('field.title'), path: '/field' },
          { name: moment.title, path: `/field/${id}` },
        ])}
      />

      <PageHero
        eyebrow={t(`field.kinds.${moment.kind}`)}
        title={moment.title}
        lead={moment.takenAt ? formatMonth(moment.takenAt, locale) : null}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[
              { name: t('nav.home'), href: '/' },
              { name: t('field.title'), href: '/field' },
              { name: moment.title },
            ]}
          />
        }
      />

      <Section className="py-10 md:py-14">
        <div className="mx-auto max-w-2xl space-y-4 text-body-lg leading-relaxed text-text">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        <h2 className="sr-only">{t('field.photos')}</h2>
        <ul className="mx-auto mt-10 grid max-w-5xl list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => {
            const src = mediaSrc(photo, 'feature') ?? mediaSrc(photo)
            if (!src) return null
            return (
              <li key={photo.id}>
                <figure className="m-0">
                  <Image
                    src={src}
                    alt={photo.alt || moment.title}
                    width={photo.width ?? 1080}
                    height={photo.height ?? 1350}
                    sizes="(min-width: 1024px) 330px, (min-width: 640px) 50vw, 100vw"
                    className="h-auto w-full rounded-xl bg-surface-sunken"
                  />
                  {photo.caption ? (
                    <figcaption className="mt-2 text-caption text-text-muted">
                      {photo.caption}
                    </figcaption>
                  ) : null}
                </figure>
              </li>
            )
          })}
        </ul>

        <p className="mt-10 text-center">
          <Link
            href="/field"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            {t('field.back')}
          </Link>
        </p>
      </Section>

      <Section tone="sunken" className="pt-4 md:pt-8">
        <ContactPanel
          locale={locale}
          settings={settings}
          eyebrow={t('home.contactEyebrow')}
          heading={t('field.contactTitle')}
          lead={t('contact.lead')}
        />
      </Section>
    </>
  )
}
