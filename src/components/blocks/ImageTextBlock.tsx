import Image from 'next/image'

import { Section } from '@/components/ui/Section'
import { cn } from '@/lib/cn'
import { mediaSrc } from '@/lib/seo'
import { BlockActions } from './BlockActions'

import type { Media, Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'imageText' }>

export function ImageTextBlock({ block, priority }: { block: Block; priority?: boolean }) {
  const image = typeof block.image === 'object' ? (block.image as Media) : null
  const src = mediaSrc(image, 'feature')

  return (
    <Section>
      <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-16">
        <div
          className={cn(
            'relative',
            // `order` follows the writing direction, so "start of the line"
            // means the right-hand side in Arabic without any RTL override.
            block.imagePosition === 'end' ? 'md:order-2' : 'md:order-1',
          )}
        >
          <div
            aria-hidden="true"
            className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-brand opacity-15 blur-2xl"
          />
          {src ? (
            <Image
              src={src}
              alt={image?.alt ?? ''}
              width={image?.width ?? 1280}
              height={image?.height ?? 854}
              priority={priority}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="rounded-xl object-cover shadow-float"
            />
          ) : null}
        </div>

        <div className={cn(block.imagePosition === 'end' ? 'md:order-1' : 'md:order-2')}>
          {block.heading ? <h2>{block.heading}</h2> : null}
          <p className="mt-5 max-w-[var(--measure)] text-body-lg text-text-muted">{block.body}</p>
          <BlockActions actions={block.actions} />
        </div>
      </div>
    </Section>
  )
}
