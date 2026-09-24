import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CategoryNav } from '@/components/blog/CategoryNav'
import { JsonLd } from '@/components/JsonLd'
import { PostCard } from '@/components/PostCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageHero } from '@/components/ui/PageHero'
import { Pagination } from '@/components/ui/Pagination'
import { Section } from '@/components/ui/Section'
import { blogCollectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import {
  getCategories,
  getCategoryBySlug,
  getCategoryCounts,
  getPosts,
  getSiteSettings,
} from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'

const PER_PAGE = 12

/**
 * One archive per category. Twelve of these pages, each a crawlable list of
 * everything the blog says on one subject — the pages that rank for the broad
 * phrases ("الاستيراد من الصين", "canton fair") the individual articles are
 * too specific for.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; slug: string }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const [{ locale, slug }, { page }] = await Promise.all([params, searchParams])
  const category = await getCategoryBySlug(slug, locale)
  if (!category) return {}
  const t = await getTranslations({ locale })
  const current = Math.max(1, Number(page ?? '1') || 1)
  const metadata = buildMetadata({
    locale,
    path: `/blog/category/${slug}`,
    title: t('blog.inCategory', { category: category.title }),
    description:
      category.description?.trim() || t('blog.categoryLead', { category: category.title }),
  })
  return current > 1 ? { ...metadata, robots: { index: false, follow: true } } : metadata
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ locale, slug }, { page }] = await Promise.all([params, searchParams])
  setRequestLocale(locale)

  const category = await getCategoryBySlug(slug, locale)
  if (!category) notFound()

  const current = Math.max(1, Number(page ?? '1') || 1)
  const [t, result, categories, counts, settings] = await Promise.all([
    getTranslations({ locale }),
    getPosts(locale, { page: current, limit: PER_PAGE, category: slug }),
    getCategories(locale),
    getCategoryCounts(locale),
    getSiteSettings(locale),
  ])

  const title = t('blog.inCategory', { category: category.title })
  const lead = category.description?.trim() || t('blog.categoryLead', { category: category.title })

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('blog.title'), path: '/blog' },
          { name: category.title, path: `/blog/category/${slug}` },
        ])}
      />
      <JsonLd
        data={blogCollectionJsonLd(locale, settings, result.docs, {
          path: `/blog/category/${slug}`,
          name: title,
          description: lead,
        })}
      />
      <PageHero
        eyebrow={t('blog.eyebrow')}
        title={category.title}
        lead={lead}
        breadcrumb={
          <Breadcrumb
            label={t('a11y.breadcrumb')}
            items={[
              { name: t('nav.home'), href: '/' },
              { name: t('blog.title'), href: '/blog' },
              { name: category.title },
            ]}
          />
        }
      />

      <Section tone="sunken" labelledBy="category-heading" className="pt-8 md:pt-10">
        <h2 id="category-heading" className="sr-only">
          {title}
        </h2>
        <div className="mb-8">
          <CategoryNav
            categories={categories}
            counts={counts}
            current={slug}
            allLabel={t('blog.allCategories')}
            label={t('blog.categories')}
          />
        </div>
        {result.docs.length === 0 ? (
          <p className="text-text-muted">{t('blog.empty')}</p>
        ) : (
          <>
            <p className="ltr-nums mb-6 text-caption text-text-muted">
              {t('blog.articleCount', { count: result.totalDocs })}
            </p>
            <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {result.docs.map((post) => (
                <PostCard key={post.id} post={post} locale={locale} />
              ))}
            </ul>
            <Pagination
              current={result.page}
              total={result.totalPages}
              basePath={`/blog/category/${slug}`}
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
    </>
  )
}
