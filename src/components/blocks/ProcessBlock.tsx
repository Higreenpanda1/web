import { Section, SectionHeading } from '@/components/ui/Section'

import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'process' }>

/**
 * The import process as a numbered flow — brief section 15 calls for exactly
 * this rather than generic corporate illustration, because the sequence is the
 * thing a nervous first-time importer actually wants to see.
 *
 * It is an <ol>, so a screen reader announces the count and the position, and
 * the connecting rule is drawn with a logical inset so it runs down the correct
 * side in both directions.
 */
export function ProcessBlock({ block }: { block: Block }) {
  const steps = block.steps ?? []
  if (steps.length === 0) return null

  return (
    <Section labelledBy={block.heading ? 'process-heading' : undefined}>
      {block.heading ? (
        <SectionHeading id="process-heading" title={block.heading} lead={block.lead} />
      ) : null}

      <ol className="grid list-none gap-8 p-0 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.id ?? index} className="relative">
            <span
              aria-hidden="true"
              className="ltr-nums mb-4 inline-flex size-12 items-center justify-center rounded-[var(--radius-full)] bg-[var(--brand-700)] text-h3 font-bold text-white"
            >
              {index + 1}
            </span>
            <h3 className="text-h3">{step.title}</h3>
            <p className="mt-2 text-[var(--text-muted)]">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
