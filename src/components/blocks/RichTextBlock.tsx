import { RichText } from '@/components/RichText'
import { Section } from '@/components/ui/Section'

import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'richText' }>

export function RichTextBlock({ block }: { block: Block }) {
  return (
    <Section>
      <div className="mx-auto max-w-[var(--measure)]">
        {block.heading ? <h2 className="mb-6">{block.heading}</h2> : null}
        <RichText data={block.content} className="text-body-lg" />
      </div>
    </Section>
  )
}
