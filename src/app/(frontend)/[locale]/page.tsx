import { getTranslations, setRequestLocale } from 'next-intl/server'
import { headers } from 'next/headers'

import { JsonLd } from '@/components/JsonLd'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { DefaultHome } from '@/components/DefaultHome'
import { organisationJsonLd } from '@/lib/jsonld'
import { getPageBySlug, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const [t, page] = await Promise.all([getTranslations({ locale }), getPageBySlug('home', locale)])

  return buildMetadata({
    locale,
    path: '/',
    title: `${t('site.name')} — ${t('site.tagline')}`,
    description: t('site.description'),
    seo: page?.seo,
  })
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [page, settings, headerList] = await Promise.all([
    getPageBySlug('home', locale),
    getSiteSettings(locale),
    headers(),
  ])
  const nonce = headerList.get('x-nonce') ?? undefined

  return (
    <>
      <JsonLd data={organisationJsonLd(settings, locale)} nonce={nonce} />
      {page?.layout && page.layout.length > 0 ? (
        <RenderBlocks blocks={page.layout} locale={locale} />
      ) : (
        // A fresh install with an empty CMS still gets a complete, sellable
        // homepage rather than a blank screen.
        <DefaultHome locale={locale} />
      )}
    </>
  )
}
