import { CtaBlock } from './CtaBlock'
import { FaqBlock } from './FaqBlock'
import { FounderBlock } from './FounderBlock'
import { HeroBlock } from './HeroBlock'
import { ImageTextBlock } from './ImageTextBlock'
import { LatestPostsBlock } from './LatestPostsBlock'
import { ProcessBlock } from './ProcessBlock'
import { RichTextBlock } from './RichTextBlock'
import { ServicesGridBlock } from './ServicesGridBlock'
import { StatsBlock } from './StatsBlock'
import { TestimonialsBlock } from './TestimonialsBlock'

import type { Locale } from '@/i18n/routing'
import type { Page } from '@/payload-types'

type Block = NonNullable<Page['layout']>[number]

/**
 * Maps a CMS layout onto components. Every block type in src/blocks/index.ts
 * has exactly one case here; an unrecognised block renders nothing rather than
 * throwing, so a half-deployed block type can never take the page down.
 */
export async function RenderBlocks({
  blocks,
  locale,
}: {
  blocks: Page['layout']
  locale: Locale
}) {
  if (!blocks || blocks.length === 0) return null

  return (
    <>
      {blocks.map((block: Block, index) => {
        const key = block.id ?? `${block.blockType}-${index}`
        // The first block is above the fold; its image gets fetch priority and
        // is never lazy-loaded, which is most of the LCP budget on mobile.
        const isFirst = index === 0

        switch (block.blockType) {
          case 'hero':
            return <HeroBlock key={key} block={block} priority={isFirst} />
          case 'richText':
            return <RichTextBlock key={key} block={block} />
          case 'servicesGrid':
            return <ServicesGridBlock key={key} block={block} locale={locale} />
          case 'stats':
            return <StatsBlock key={key} block={block} />
          case 'process':
            return <ProcessBlock key={key} block={block} />
          case 'imageText':
            return <ImageTextBlock key={key} block={block} priority={isFirst} />
          case 'founder':
            return <FounderBlock key={key} block={block} />
          case 'testimonials':
            return <TestimonialsBlock key={key} block={block} locale={locale} />
          case 'latestPosts':
            return <LatestPostsBlock key={key} block={block} locale={locale} />
          case 'faq':
            return <FaqBlock key={key} block={block} />
          case 'cta':
            return <CtaBlock key={key} block={block} locale={locale} />
          default:
            return null
        }
      })}
    </>
  )
}
