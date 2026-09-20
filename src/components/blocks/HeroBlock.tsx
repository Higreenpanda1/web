import Image from 'next/image'

import { Container } from '@/components/ui/Container'
import { mediaUrl } from '@/lib/seo'
import { BlockActions } from './BlockActions'

import type { Media, Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'hero' }>

export function HeroBlock({ block, priority }: { block: Block; priority?: boolean }) {
  const image = typeof block.image === 'object' ? (block.image as Media) : null
  const src = mediaUrl(image, 'hero')

  if (!src) {
    return (
      <section className="bg-[var(--brand-900)] py-16 text-[var(--text-on-inverse)] md:py-24">
        <Container>
          <HeroCopy block={block} inverse />
        </Container>
      </section>
    )
  }

  return (
    <section className="relative isolate overflow-hidden py-20 text-[var(--text-on-inverse)] md:py-28">
      <Image
        src={src}
        alt={image?.alt ?? ''}
        fill
        priority={priority}
        sizes="100vw"
        className="-z-20 object-cover"
      />
      {/* Brief section 15: brand-900 at 55%, not black. */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'var(--overlay-photo)' }}
        aria-hidden="true"
      />
      <Container>
        <HeroCopy block={block} inverse />
      </Container>
    </section>
  )
}

function HeroCopy({ block, inverse }: { block: Block; inverse: boolean }) {
  return (
    <div className="max-w-[46rem]">
      {block.eyebrow ? (
        <p className="mb-3 text-caption font-semibold tracking-wide text-[var(--brand-300)] uppercase">
          {block.eyebrow}
        </p>
      ) : null}
      <h1 className="text-display text-balance text-white">{block.heading}</h1>
      {block.lead ? (
        <p className="mt-5 text-body-lg text-[var(--brand-100)]">{block.lead}</p>
      ) : null}
      <BlockActions actions={block.actions} inverse={inverse} />
    </div>
  )
}
