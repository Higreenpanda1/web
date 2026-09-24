import { Rss } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CategoryNav } from '@/components/blog/CategoryNav'
import { JsonLd } from '@/components/JsonLd'
import { PostCard } from '@/components/PostCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageHero } from '@/components/ui/PageHero'
import { Pagination } from '@/components/ui/Pagination'
import { Section } from '@/components/ui/Section'
import { blogCollectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { getCategories, getCategoryCounts, getPosts, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'

const PER_PAGE = 12

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const [{ locale }, { page }] = await Promise.all([params, searchParams])
  const t = await getTranslations({ locale })
  const current = Math.max(1, Number(page ?? '1') || 1)
  const metadata = buildMetadata({
    locale,
    path: current > 1 ? `/blog?page=${current}` : '/blog',
    title:
      current > 1
        ? `${t('blog.title')} — ${t('blog.pagination.page', { current, total: '' }).trim()}`
        : t('blog.title'),
    description: t('blog.lead'),
  })
  // Page 2 onwards is a continuation, not a page worth ranking on its own.
  return current > 1 ? { ...metadata, robots: { index: false, follow: true } } : metadata
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
  const [t, result, categories, counts, settings] = await Promise.all([
    getTranslations({ locale }),
    getPosts(locale, { page: current, limit: PER_PAGE }),
    getCategories(locale),
    getCategoryCounts(locale),
    getSiteSettings(locale),
  ])

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('blog.title'), path: '/blog' },
        ])}
      />
      {current === 1 ? (
        <JsonLd
          data={blogCollectionJsonLd(locale, settings, result.docs, {
            path: '/blog',
            name: t('blog.title'),
            description: t('blog.lead'),
          })}
        />
      ) : null}
      <PageHero
        eyebrow={t('blog.eyebrow')}
        title={t('blog.title')}
        lead={t('blog.lead')}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[{ name: t('nav.home'), href: '/' }, { name: t('blog.title') }]}
          />
        }
      />

      <Section tone="sunken" labelledBy="blog-heading" className="pt-8 md:pt-10">
        <h2 id="blog-heading" className="sr-only">
          {t('blog.title')}
        </h2>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <CategoryNav
            categories={categories}
            counts={counts}
            allLabel={t('blog.allCategories')}
            label={t('blog.categories')}
          />
        </div>
        {result.docs.length === 0 ? (
          <p className="text-text-muted">{t('blog.empty')}</p>
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
        <p className="mt-10 text-caption text-text-muted">
          <a
            href={locale === 'en' ? '/en/feed.xml' : '/feed.xml'}
            className="inline-flex items-center gap-1.5 font-semibold text-text-brand"
          >
            <Rss size={14} strokeWidth={2} aria-hidden="true" />
            {t('blog.rss')}
          </a>
        </p>
      </Section>
    </>
  )
}
