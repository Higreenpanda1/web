import { getTranslations, setRequestLocale } from 'next-intl/server'

import { FieldGallery } from '@/components/FieldGallery'
import { ContactPanel } from '@/components/home/ContactPanel'
import { JsonLd } from '@/components/JsonLd'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageHero } from '@/components/ui/PageHero'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { Section, SectionHeading } from '@/components/ui/Section'
import { FIELD_KINDS } from '@/collections/FieldMoments'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getFieldMoments, getSiteSettings } from '@/lib/queries'
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
    path: '/field',
    title: t('field.title'),
    description: t('field.lead'),
  })
}

/**
 * Real photos from the work, grouped by where they were taken. A visitor who
 * has never met us sees the office, the fairs and the factories before they
 * write; that does more for trust than any sentence on the homepage.
 */
export default async function FieldPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, moments, settings] = await Promise.all([
    getTranslations({ locale }),
    getFieldMoments(locale),
    getSiteSettings(locale),
  ])

  const groups = FIELD_KINDS.map((kind) => ({
    kind,
    items: moments.filter((moment) => moment.kind === kind),
  })).filter((group) => group.items.length > 0)

  return (
    <>
      <ScrollReveal />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('field.title'), path: '/field' },
        ])}
      />

      <PageHero
        eyebrow={t('field.eyebrow')}
        title={t('field.title')}
        lead={t('field.lead')}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[{ name: t('nav.home'), href: '/' }, { name: t('field.title') }]}
          />
        }
      />

      {groups.length === 0 ? (
        <Section>
          <p className="text-center text-text-muted">{t('field.empty')}</p>
        </Section>
      ) : (
        groups.map((group, index) => (
          <Section
            key={group.kind}
            tone={index % 2 === 1 ? 'sunken' : 'default'}
            labelledBy={`field-${group.kind}-heading`}
            className="py-12 md:py-16"
          >
            <SectionHeading
              id={`field-${group.kind}-heading`}
              title={t(`field.kinds.${group.kind}`)}
              className="mb-6 md:mb-8"
            />
            <FieldGallery moments={group.items} locale={locale} />
          </Section>
        ))
      )}

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
