import { getTranslations } from 'next-intl/server'

import { RichText } from '@/components/RichText'
import { Container } from '@/components/ui/Container'
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
    <Container className="py-14 md:py-20">
      <div className="prose-hgp">
        <h1 className="text-h1">{page?.title ?? title}</h1>
        {updated ? (
          <p className="ltr-nums text-caption text-[var(--text-muted)]">
            {t('legal.lastUpdated', { date: formatDate(updated, locale) })}
          </p>
        ) : null}

        {page?.layout && page.layout.length > 0
          ? page.layout.map((block, index) =>
              block.blockType === 'richText' ? (
                <RichText key={block.id ?? index} data={block.content} className="max-w-none" />
              ) : null,
            )
          : fallback}
      </div>
    </Container>
  )
}
