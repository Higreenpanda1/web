import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { ContactPanel } from '@/components/home/ContactPanel'
import { JsonLd } from '@/components/JsonLd'
import { PlayMark } from '@/components/layout/Logo'
import { PostCard } from '@/components/PostCard'
import { RichText } from '@/components/RichText'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Section, SectionHeading } from '@/components/ui/Section'
import { formatDate, isoDate } from '@/i18n/format'
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { getPostBySlug, getSiteSettings } from '@/lib/queries'
import { buildMetadata, mediaSrc } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Category, Media, Post, TeamMember } from '@/payload-types'
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
  const coverSrc = mediaSrc(cover, 'feature')
  const author = typeof post.author === 'object' && post.author ? (post.author as TeamMember) : null
  const category = (post.categories ?? []).find(
    (entry): entry is Category => typeof entry === 'object' && entry !== null,
  )
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
        <header className="relative isolate overflow-hidden bg-surface bg-gradient-hero">
          <div className="absolute inset-0 -z-10 bg-dots opacity-70" aria-hidden="true" />
          <Container className="py-12 md:py-16">
            <Breadcrumb
              label={t('a11y.breadcrumb')}
              className="mb-8"
              items={[
                { name: t('nav.home'), href: '/' },
                { name: t('blog.title'), href: '/blog' },
                { name: post.title },
              ]}
            />
            <div className="mx-auto max-w-[var(--measure)]">
              {category ? <Eyebrow className="mb-4">{category.title}</Eyebrow> : null}
              <h1 className="text-display">{post.title}</h1>
              <p className="mt-6 text-body-lg text-text-muted">{post.excerpt}</p>
              <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
                {author ? (
                  <span className="inline-flex items-center gap-2 font-semibold text-text">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-8 items-center justify-center rounded-full bg-surface-tint text-caption font-bold text-brand-800"
                    >
                      {author.name.slice(0, 1)}
                    </span>
                    {t('blog.by', { author: author.name })}
                  </span>
                ) : null}
                <bdi>
                  <time dateTime={isoDate(post.publishedAt)}>
                    {t('blog.publishedOn', { date: formatDate(post.publishedAt, locale) })}
                  </time>
                </bdi>
                {post.readingMinutes ? (
                  <bdi>{t('blog.readingTime', { minutes: post.readingMinutes })}</bdi>
                ) : null}
              </p>
            </div>
          </Container>
        </header>

        <Container>
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={cover?.alt ?? ''}
              width={1280}
              height={720}
              priority
              sizes="(min-width: 1200px) 1200px, 100vw"
              className="aspect-[16/9] w-full rounded-xl object-cover shadow-card"
            />
          ) : null}
        </Container>

        <Container className="py-12 md:py-16">
          <div className="mx-auto max-w-[var(--measure)]">
            <RichText data={post.body} className="text-body-lg" />
            <p className="mt-12 flex items-center gap-3 border-t border-border-soft pt-8 text-caption text-text-muted">
              <PlayMark size={28} />
              {settings.organisationName}
            </p>
          </div>
        </Container>
      </article>

      {related.length > 0 ? (
        <Section tone="sunken" labelledBy="related-heading">
          <SectionHeading
            id="related-heading"
            eyebrow={t('blog.eyebrow')}
            title={t('blog.relatedTitle')}
          />
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} locale={locale} />
            ))}
          </ul>
        </Section>
      ) : null}

      <Section className="pt-0 md:pt-0">
        <ContactPanel
          locale={locale}
          settings={settings}
          eyebrow={t('home.contactEyebrow')}
          heading={t('home.contactTitle')}
          lead={t('home.contactLead')}
          showForm={false}
        />
      </Section>
    </>
  )
}
