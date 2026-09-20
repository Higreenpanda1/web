import Image from 'next/image'

import { PlayMark } from '@/components/layout/Logo'
import { Container } from '@/components/ui/Container'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { mediaUrl } from '@/lib/seo'
import { BlockActions } from './BlockActions'

import type { Media, Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'hero' }>

/**
 * The CMS hero. With a photo it is the photo, under the brand-900 overlay the
 * brief asks for. Without one it is the same light, dot-grid treatment as the
 * default homepage, so a page built in the CMS never looks like a different
 * site.
 */
export function HeroBlock({ block, priority }: { block: Block; priority?: boolean }) {
  const image = typeof block.image === 'object' ? (block.image as Media) : null
  const src = mediaUrl(image, 'hero')

  if (!src) {
    return (
      <section className="relative isolate overflow-hidden bg-surface bg-gradient-hero">
        <div className="absolute inset-0 -z-10 bg-dots opacity-80" aria-hidden="true" />
        <PlayMark
          size={560}
          className="pointer-events-none absolute -top-44 -end-44 -z-10 opacity-[0.07]"
        />
        <Container className="py-16 md:py-24 lg:py-28">
          <div className="max-w-[46rem]">
            {block.eyebrow ? <Eyebrow className="mb-4">{block.eyebrow}</Eyebrow> : null}
            <h1 className="text-display">{block.heading}</h1>
            {block.lead ? <p className="mt-6 text-body-lg text-text-muted">{block.lead}</p> : null}
            <BlockActions actions={block.actions} />
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section className="relative isolate overflow-hidden py-24 text-text-on-inverse md:py-36">
      <Image
        src={src}
        alt={image?.alt ?? ''}
        fill
        priority={priority}
        sizes="100vw"
        className="-z-20 object-cover"
      />
      {/* Brief section 15: brand-900 at 55%, not black. */}
      <div className="absolute inset-0 -z-10 bg-[var(--overlay-photo)]" aria-hidden="true" />
      <Container>
        <div className="max-w-[46rem]">
          {block.eyebrow ? (
            <Eyebrow inverse className="mb-4">
              {block.eyebrow}
            </Eyebrow>
          ) : null}
          <h1 className="text-display text-white">{block.heading}</h1>
          {block.lead ? <p className="mt-6 text-body-lg text-brand-100">{block.lead}</p> : null}
          <BlockActions actions={block.actions} inverse />
        </div>
      </Container>
    </section>
  )
}
