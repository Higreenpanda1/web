import { getTranslations, setRequestLocale } from 'next-intl/server'

import { JsonLd } from '@/components/JsonLd'
import { PostCard } from '@/components/PostCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageHero } from '@/components/ui/PageHero'
import { Pagination } from '@/components/ui/Pagination'
import { Section } from '@/components/ui/Section'
import { breadcrumbJsonLd } from '@/lib/jsonld'
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
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('blog.title'), path: '/blog' },
        ])}
      />
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

      <Section tone="sunken" labelledBy="blog-heading" className="pt-10 md:pt-14">
        <h2 id="blog-heading" className="sr-only">
          {t('blog.title')}
        </h2>
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
      </Section>
    </>
  )
}
