import { getTranslations } from 'next-intl/server'

import { ButtonLink } from '@/components/ui/Button'
import { PostCard } from '@/components/PostCard'
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

  return (
    <Section tone="sunken" labelledBy={block.heading ? 'latest-posts-heading' : undefined}>
      {block.heading ? (
        <SectionHeading id="latest-posts-heading" title={block.heading} lead={block.lead} />
      ) : null}
      <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((post) => (
          <PostCard key={post.id} post={post} locale={locale} />
        ))}
      </ul>
      <div className="mt-8">
        <ButtonLink href="/blog" variant="secondary">
          {t('blog.title')}
        </ButtonLink>
      </div>
    </Section>
  )
}
