import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { AuthorCard } from '@/components/blog/AuthorCard'
import { KeyTakeaways } from '@/components/blog/KeyTakeaways'
import { PostNav } from '@/components/blog/PostNav'
import { ShareLinks } from '@/components/blog/ShareLinks'
import { TableOfContents } from '@/components/blog/TableOfContents'
import { ContactPanel } from '@/components/home/ContactPanel'
import { JsonLd } from '@/components/JsonLd'
import { PlayMark } from '@/components/layout/Logo'
import { PostCard } from '@/components/PostCard'
import { RichText } from '@/components/RichText'
import { Accordion } from '@/components/ui/Accordion'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Section, SectionHeading } from '@/components/ui/Section'
import { formatDate, isoDate } from '@/i18n/format'
import { Link } from '@/i18n/navigation'
import { blogPostingJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld'
import { extractHeadings } from '@/lib/lexical'
import { getAdjacentPosts, getPostBySlug, getRelatedPosts, getSiteSettings } from '@/lib/queries'
import { buildMetadata, mediaSrc } from '@/lib/seo'
import { absoluteUrl } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { Category, Media, Post, TeamMember } from '@/payload-types'
import type { Metadata } from 'next'

function localesOf(post: Post): Locale[] {
  const available = (post.localesAvailable ?? []) as Locale[]
  return available.length > 0 ? available : ['ar', 'en']
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getPostBySlug(slug, locale)
  if (!post) return {}
  const locales = localesOf(post)
  if (!locales.includes(locale)) return {}

  const author = typeof post.author === 'object' && post.author ? (post.author as TeamMember) : null
  const cover = typeof post.coverImage === 'object' ? (post.coverImage as Media) : null
  const categories = (post.categories ?? []).filter(
    (entry): entry is Category => typeof entry === 'object' && entry !== null,
  )

  const metadata = buildMetadata({
    locale,
    path: `/blog/${slug}`,
    title: post.title,
    description: post.excerpt,
    seo: { ...post.seo, image: post.seo?.image ?? cover ?? null },
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt ?? post.publishedAt,
    authors: author ? [author.name] : undefined,
  })

  // An article that exists in one language has no alternate in the other.
  if (locales.length === 1 && metadata.alternates) {
    metadata.alternates = {
      canonical: metadata.alternates.canonical,
      languages: {
        [locale]: absoluteUrl(locale, `/blog/${slug}`),
        'x-default': absoluteUrl(locale, `/blog/${slug}`),
      },
    }
  }

  return {
    ...metadata,
    ...(post.focusKeyword || categories.length
      ? {
          keywords: [post.focusKeyword, ...categories.map((c) => c.title)].filter(
            Boolean,
          ) as string[],
        }
      : {}),
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      ...(categories[0] ? { section: categories[0].title } : {}),
      tags: categories.map((category) => category.title),
    },
  }
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
  const locales = localesOf(post)
  // An Arabic-only article is not served under /en: the fallback would show
  // Arabic on an English URL, which is worse for the reader and for search.
  if (!locales.includes(locale)) notFound()

  const [t, settings, adjacent, chosenRelated] = await Promise.all([
    getTranslations({ locale }),
    getSiteSettings(locale),
    getAdjacentPosts(post, locale),
    Promise.resolve(
      (post.relatedPosts ?? []).filter(
        (entry): entry is Post => typeof entry === 'object' && entry !== null,
      ),
    ),
  ])
  const related = chosenRelated.length > 0 ? chosenRelated : await getRelatedPosts(post, locale)

  const cover = typeof post.coverImage === 'object' ? (post.coverImage as Media) : null
  const coverSrc = mediaSrc(cover, 'feature')
  const author = typeof post.author === 'object' && post.author ? (post.author as TeamMember) : null
  const categories = (post.categories ?? []).filter(
    (entry): entry is Category => typeof entry === 'object' && entry !== null,
  )
  const category = categories[0]
  const headings = extractHeadings(post.body)
  const takeaways = post.keyTakeaways ?? []
  const faqs = (post.faqs ?? []).map((item) => ({ question: item.question, answer: item.answer }))
  const url = absoluteUrl(locale, `/blog/${slug}`)
  // "Updated on" only when a person edited the article after it was created:
  // the import and the migration both set updatedAt without changing a word.
  const updated =
    post.updatedAt &&
    post.createdAt &&
    new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 3_600_000 &&
    new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > 86_400_000

  return (
    <>
      <JsonLd data={blogPostingJsonLd(post, locale, settings, { availableLocales: locales })} />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t('nav.home'), path: '/' },
          { name: t('blog.title'), path: '/blog' },
          ...(category ? [{ name: category.title, path: `/blog/category/${category.slug}` }] : []),
          { name: post.title, path: `/blog/${slug}` },
        ])}
      />
      {faqs.length > 0 ? <JsonLd data={faqJsonLd(faqs)} /> : null}

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
                ...(category
                  ? [{ name: category.title, href: `/blog/category/${category.slug}` }]
                  : []),
                { name: post.title },
              ]}
            />
            <div className="mx-auto max-w-[var(--measure)]">
              {category ? (
                <Link href={`/blog/category/${category.slug}`} className="no-underline">
                  <Eyebrow className="mb-4">{category.title}</Eyebrow>
                </Link>
              ) : null}
              <h1 className="text-display text-balance">{post.title}</h1>
              <p className="mt-6 text-body-lg text-text-muted" data-speakable>
                {post.excerpt}
              </p>
              <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
                {author ? (
                  <span className="inline-flex items-center gap-2 font-semibold text-text">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-8 items-center justify-center rounded-full bg-surface-tint text-caption font-bold text-text-brand"
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
                {updated && post.updatedAt ? (
                  <bdi>
                    <time dateTime={isoDate(post.updatedAt)}>
                      {t('blog.updatedOn', { date: formatDate(post.updatedAt, locale) })}
                    </time>
                  </bdi>
                ) : null}
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
          <div className="mx-auto grid max-w-[var(--measure)] gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-[minmax(0,var(--measure))_minmax(16rem,20rem)] lg:justify-center lg:gap-14">
            <div className="min-w-0">
              {takeaways.length > 0 ? (
                <KeyTakeaways items={takeaways} title={t('blog.keyTakeaways')} />
              ) : null}
              <div className="lg:hidden">
                <div className="mt-8">
                  <TableOfContents headings={headings} title={t('blog.contents')} />
                </div>
              </div>
              <RichText
                data={post.body}
                className={
                  takeaways.length || headings.length >= 3 ? 'mt-10 text-body-lg' : 'text-body-lg'
                }
              />

              {faqs.length > 0 ? (
                <section aria-labelledby="faq-heading" className="mt-14">
                  <h2 id="faq-heading" className="text-h2">
                    {t('blog.faqTitle')}
                  </h2>
                  <Accordion items={faqs} className="mt-5" />
                </section>
              ) : null}

              <div className="mt-12 border-t border-border-soft pt-8">
                <ShareLinks
                  url={url}
                  title={post.title}
                  labels={{
                    share: t('blog.share'),
                    whatsapp: t('blog.shareWhatsApp'),
                    x: t('blog.shareX'),
                    linkedin: t('blog.shareLinkedIn'),
                    copy: t('blog.copyLink'),
                    copied: t('blog.copied'),
                  }}
                />
              </div>

              {author ? (
                <div className="mt-10">
                  <AuthorCard
                    member={author}
                    locale={locale}
                    title={t('blog.aboutAuthor')}
                    moreLabel={t('cta.learnMore')}
                  />
                </div>
              ) : null}

              <div className="mt-10">
                <PostNav
                  previous={adjacent.previous}
                  next={adjacent.next}
                  labels={{ previous: t('blog.previousPost'), next: t('blog.nextPost') }}
                />
              </div>

              <p className="mt-12 flex items-center gap-3 text-caption text-text-muted">
                <PlayMark size={28} />
                {settings.organisationName}
              </p>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <TableOfContents headings={headings} title={t('blog.contents')} />
                <div className="rounded-lg bg-gradient-deep p-6 text-text-on-inverse">
                  <p className="text-h3 font-bold">{t('blog.ctaTitle')}</p>
                  <p className="mt-2 text-caption text-white/80">{t('blog.ctaLead')}</p>
                  <Link
                    href="/contact"
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 font-semibold text-brand-900 no-underline hover:bg-brand-50"
                  >
                    {t('cta.contactUs')}
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </article>

      {related.length > 0 ? (
        <Section tone="sunken" labelledBy="related-heading">
          <SectionHeading
            id="related-heading"
            eyebrow={category?.title ?? t('blog.eyebrow')}
            title={t('blog.relatedTitle')}
          />
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {related.slice(0, 3).map((item) => (
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
