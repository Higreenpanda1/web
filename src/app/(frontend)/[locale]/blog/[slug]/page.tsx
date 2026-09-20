import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import { PostCard } from '@/components/PostCard'
import { RichText } from '@/components/RichText'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { formatDate, isoDate } from '@/i18n/format'
import { Link } from '@/i18n/navigation'
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { getPostBySlug, getSiteSettings } from '@/lib/queries'
import { buildMetadata, mediaUrl } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Media, Post, TeamMember } from '@/payload-types'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getPostBySlug(slug, locale)
  if (!post) return {}

  const author = typeof post.author === 'object' && post.author ? (post.author as TeamMember) : null

  return buildMetadata({
    locale,
    path: `/blog/${slug}`,
    title: post.title,
    description: post.excerpt,
    seo: post.seo,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt ?? post.publishedAt,
    authors: author ? [author.name] : undefined,
  })
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const post = await getPostBySlug(slug, locale)
  if (!post) notFound()

  const [t, settings] = await Promise.all([getTranslations({ locale }), getSiteSettings(locale)])

  const cover = typeof post.coverImage === 'object' ? (post.coverImage as Media) : null
  const coverSrc = mediaUrl(cover, 'feature')
  const author = typeof post.author === 'object' && post.author ? (post.author as TeamMember) : null
  const related = (post.relatedPosts ?? []).filter(
    (entry): entry is Post => typeof entry === 'object' && entry !== null,
  )

  return (
    <>
      <JsonLd data={blogPostingJsonLd(post, locale, settings)} />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('blog.title'), path: '/blog' },
          { name: post.title, path: `/blog/${slug}` },
        ])}
      />

      <article>
        <Container as="header" className="py-12 md:py-16">
          <nav aria-label={t('a11y.breadcrumb')} className="mb-5 text-caption">
            <Link href="/blog" className="no-underline hover:underline">
              {t('blog.backToBlog')}
            </Link>
          </nav>

          <div className="max-w-[var(--measure)]">
            <h1 className="text-h1">{post.title}</h1>
            <p className="ltr-nums mt-4 text-caption text-[var(--text-muted)]">
              <time dateTime={isoDate(post.publishedAt)}>
                {t('blog.publishedOn', { date: formatDate(post.publishedAt, locale) })}
              </time>
              {post.readingMinutes ? (
                <> · {t('blog.readingTime', { minutes: post.readingMinutes })}</>
              ) : null}
              {author ? <> · {t('blog.by', { author: author.name })}</> : null}
            </p>
            <p className="mt-5 text-body-lg text-[var(--text-muted)]">{post.excerpt}</p>
          </div>
        </Container>

        {coverSrc ? (
          <Container>
            <Image
              src={coverSrc}
              alt={cover?.alt ?? ''}
              width={1280}
              height={720}
              priority
              sizes="(min-width: 1200px) 1200px, 100vw"
              className="aspect-[16/9] w-full rounded-[var(--radius-lg)] object-cover"
            />
          </Container>
        ) : null}

        <Container className="py-12">
          <RichText data={post.body} />
        </Container>
      </article>

      <Section tone="inverse">
        <div className="max-w-[var(--measure)]">
          <h2 className="text-white">{t('home.contactTitle')}</h2>
          <p className="mt-4 text-body-lg text-[var(--brand-100)]">{t('home.contactLead')}</p>
          <ButtonLink href="/contact" size="lg" variant="inverse" className="mt-7">
            {t('cta.enquire')}
          </ButtonLink>
        </div>
      </Section>

      {related.length > 0 ? (
        <Section tone="sunken" labelledBy="related-heading">
          <h2 id="related-heading" className="mb-8">
            {t('blog.relatedTitle')}
          </h2>
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} locale={locale} />
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  )
}
