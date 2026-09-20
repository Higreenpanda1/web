import { ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { PlayMark } from '@/components/layout/Logo'
import { Card } from '@/components/ui/Card'
import { formatDate, isoDate } from '@/i18n/format'
import { Link } from '@/i18n/navigation'
import { mediaUrl } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Category, Media, Post } from '@/payload-types'

export async function PostCard({ post, locale }: { post: Post; locale: Locale }) {
  const t = await getTranslations({ locale })
  const cover = typeof post.coverImage === 'object' ? (post.coverImage as Media) : null
  const src = mediaUrl(cover, 'card')
  const category = (post.categories ?? []).find(
    (entry): entry is Category => typeof entry === 'object' && entry !== null,
  )
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <Card as="li" interactive className="group relative flex flex-col overflow-hidden p-0">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-deep">
        {src ? (
          <Image
            src={src}
            alt={cover?.alt ?? ''}
            width={768}
            height={480}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="absolute inset-0 bg-dots-inverse opacity-50" />
            <PlayMark onDark size={64} className="relative opacity-90" />
          </div>
        )}
        {category ? (
          <span className="absolute top-4 start-4 rounded-full bg-white/92 px-3 py-1 text-eyebrow font-bold text-brand-900 shadow-sm">
            {category.title}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-caption text-text-muted">
          <bdi>
            <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt, locale)}</time>
          </bdi>
          {post.readingMinutes ? (
            <>
              {' · '}
              <bdi>{t('blog.readingTime', { minutes: post.readingMinutes })}</bdi>
            </>
          ) : null}
        </p>

        <h3 className="mt-2.5">
          <Link
            href={`/blog/${post.slug}`}
            className="text-inherit no-underline after:absolute after:inset-0 after:content-['']"
          >
            {post.title}
          </Link>
        </h3>

        <p className="mt-2.5 line-clamp-3 flex-1 text-text-muted">{post.excerpt}</p>

        <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-text-brand">
          {t('cta.readMore')}
          <Arrow
            size={18}
            strokeWidth={2}
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
          />
        </span>
      </div>
    </Card>
  )
}
