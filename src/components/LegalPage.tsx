import { getTranslations } from 'next-intl/server'

import { RichText } from '@/components/RichText'
import { Container } from '@/components/ui/Container'
import { PageHero } from '@/components/ui/PageHero'
import { formatDate } from '@/i18n/format'
import { getPageBySlug, getSiteSettings } from '@/lib/queries'

import type { Locale } from '@/i18n/routing'

/**
 * Privacy and terms. Both are ordinary Pages in the CMS, so the client's
 * lawyer can change the wording without a deploy — but each ships with a
 * plain-language default so the site is never live without them.
 */
export async function LegalPage({
  locale,
  slug,
  title,
  fallback,
}: {
  locale: Locale
  slug: 'privacy' | 'terms'
  title: string
  fallback: React.ReactNode
}) {
  const [t, page, settings] = await Promise.all([
    getTranslations({ locale }),
    getPageBySlug(slug, locale),
    getSiteSettings(locale),
  ])

  const updated = settings.legalUpdatedAt

  return (
    <>
      <PageHero
        title={page?.title ?? title}
        lead={updated ? t('legal.lastUpdated', { date: formatDate(updated, locale) }) : null}
      />
      <Container className="py-12 md:py-16">
        <div className="prose-hgp mx-auto">
          {page?.layout && page.layout.length > 0
            ? page.layout.map((block, index) =>
                block.blockType === 'richText' ? (
                  <RichText key={block.id ?? index} data={block.content} className="max-w-none" />
                ) : null,
              )
            : fallback}
        </div>
      </Container>
    </>
  )
}
