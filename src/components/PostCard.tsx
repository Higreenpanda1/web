import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { Card } from '@/components/ui/Card'
import { formatDate, isoDate } from '@/i18n/format'
import { mediaUrl } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Media, Post } from '@/payload-types'

export async function PostCard({ post, locale }: { post: Post; locale: Locale }) {
  const t = await getTranslations({ locale })
  const cover = typeof post.coverImage === 'object' ? (post.coverImage as Media) : null
  const src = mediaUrl(cover, 'card')

  return (
    <Card as="li" className="group relative flex flex-col overflow-hidden p-0 hover:shadow-lg">
      {src ? (
        <Image
          src={src}
          alt={cover?.alt ?? ''}
          width={768}
          height={432}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[16/9] w-full object-cover"
        />
      ) : null}

      <div className="flex flex-1 flex-col p-6">
        <p className="ltr-nums mb-2 text-caption text-[var(--text-muted)]">
          <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt, locale)}</time>
          {post.readingMinutes ? (
            <> · {t('blog.readingTime', { minutes: post.readingMinutes })}</>
          ) : null}
        </p>

        <h3 className="text-h3">
          <Link
            href={`/blog/${post.slug}`}
            className="text-[var(--heading)] no-underline after:absolute after:inset-0 after:content-['']"
          >
            {post.title}
          </Link>
        </h3>

        <p className="mt-2 flex-1 text-[var(--text-muted)]">{post.excerpt}</p>
      </div>
    </Card>
  )
}
