import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { PostCard } from '@/components/PostCard'
import { ButtonLink } from '@/components/ui/Button'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getPosts } from '@/lib/queries'

import type { Locale } from '@/i18n/routing'
import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'latestPosts' }>

export async function LatestPostsBlock({ block, locale }: { block: Block; locale: Locale }) {
  const [{ docs }, t] = await Promise.all([
    getPosts(locale, { limit: block.limit ?? 3 }),
    getTranslations({ locale }),
  ])
  if (docs.length === 0) return null
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <Section tone="sunken" labelledBy={block.heading ? 'latest-posts-heading' : undefined}>
      <SectionHeading
        id="latest-posts-heading"
        eyebrow={t('home.blogEyebrow')}
        title={block.heading ?? t('home.blogTitle')}
        lead={block.lead}
        action={
          <ButtonLink href="/blog" variant="secondary">
            {t('blog.title')}
            <Arrow size={18} strokeWidth={2} aria-hidden="true" />
          </ButtonLink>
        }
      />
      <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((post) => (
          <PostCard key={post.id} post={post} locale={locale} />
        ))}
      </ul>
    </Section>
  )
}
