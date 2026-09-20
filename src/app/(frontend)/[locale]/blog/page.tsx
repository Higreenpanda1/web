import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PostCard } from '@/components/PostCard'
import { Pagination } from '@/components/ui/Pagination'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getPosts } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'

const PER_PAGE = 9

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return buildMetadata({
    locale,
    path: '/blog',
    title: t('blog.title'),
    description: t('blog.lead'),
  })
}

export default async function BlogIndex({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ locale }, { page }] = await Promise.all([params, searchParams])
  setRequestLocale(locale)

  const current = Math.max(1, Number(page ?? '1') || 1)
  const [t, result] = await Promise.all([
    getTranslations({ locale }),
    getPosts(locale, { page: current, limit: PER_PAGE }),
  ])

  return (
    <Section labelledBy="blog-heading">
      <SectionHeading id="blog-heading" title={t('blog.title')} lead={t('blog.lead')} />

      {result.docs.length === 0 ? (
        <p className="text-[var(--text-muted)]">{t('blog.empty')}</p>
      ) : (
        <>
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {result.docs.map((post) => (
              <PostCard key={post.id} post={post} locale={locale} />
            ))}
          </ul>
          <Pagination
            current={result.page}
            total={result.totalPages}
            basePath="/blog"
            labels={{
              previous: t('blog.pagination.previous'),
              next: t('blog.pagination.next'),
              nav: t('blog.pagination.label'),
              page: t('blog.pagination.page', { current: result.page, total: result.totalPages }),
            }}
          />
        </>
      )}
    </Section>
  )
}
