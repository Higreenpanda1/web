import { getTranslations, setRequestLocale } from 'next-intl/server'

import { NasherStory } from '@/components/companies/NasherStory'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd } from '@/lib/jsonld'
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
    path: '/nasher',
    title: t('companies.nasher.name'),
    description: t('companies.nasher.metaDescription'),
  })
}

/**
 * Nasher International Trading: parts for yachts, boats and cars, always in
 * that order (owner, 28 October 2026). The page is the scroll story the owner
 * approved: the yacht and the car opening into their parts, the services, the
 * four steps and the payments map.
 */
export default async function NasherPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale })

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('companies.nasher.name'), path: '/nasher' },
        ])}
      />
      <NasherStory locale={locale} />
    </>
  )
}
