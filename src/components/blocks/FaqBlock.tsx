import { JsonLd } from '@/components/JsonLd'
import { Section, SectionHeading } from '@/components/ui/Section'
import { faqJsonLd } from '@/lib/jsonld'

import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'faq' }>

/**
 * Native <details>: keyboard accessible, announced correctly, and works before
 * hydration — which on a slow 4G connection is most of the time a visitor
 * spends on the page.
 */
export function FaqBlock({ block }: { block: Block }) {
  const items = (block.items ?? []).map((item) => ({
    question: item.question,
    answer: item.answer,
  }))
  if (items.length === 0) return null

  return (
    <Section labelledBy={block.heading ? 'faq-heading' : undefined}>
      {block.heading ? <SectionHeading id="faq-heading" title={block.heading} /> : null}
      <div className="max-w-[var(--measure)]">
        {items.map((item, index) => (
          <details
            key={index}
            className="border-b border-[var(--border)] py-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="cursor-pointer list-none text-body-lg font-semibold text-[var(--heading)] marker:content-none">
              {item.question}
            </summary>
            <p className="mt-3 text-[var(--text-muted)]">{item.answer}</p>
          </details>
        ))}
      </div>
      <JsonLd data={faqJsonLd(items)} />
    </Section>
  )
}
