import { JsonLd } from '@/components/JsonLd'
import { Accordion } from '@/components/ui/Accordion'
import { Section, SectionHeading } from '@/components/ui/Section'
import { faqJsonLd } from '@/lib/jsonld'

import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'faq' }>

export function FaqBlock({ block }: { block: Block }) {
  const items = (block.items ?? []).map((item) => ({
    question: item.question,
    answer: item.answer,
  }))
  if (items.length === 0) return null

  return (
    <Section labelledBy={block.heading ? 'faq-heading' : undefined}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
        {block.heading ? (
          <SectionHeading id="faq-heading" title={block.heading} className="mb-0 md:mb-0" />
        ) : (
          <div />
        )}
        <Accordion items={items} />
      </div>
      <JsonLd data={faqJsonLd(items)} />
    </Section>
  )
}
