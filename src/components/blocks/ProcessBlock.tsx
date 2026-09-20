import { ProcessSteps } from '@/components/home/ProcessSteps'
import { Section, SectionHeading } from '@/components/ui/Section'

import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'process' }>

export function ProcessBlock({ block }: { block: Block }) {
  const steps = (block.steps ?? []).map((step) => ({ title: step.title, body: step.body }))
  if (steps.length === 0) return null

  return (
    <Section labelledBy={block.heading ? 'process-heading' : undefined}>
      {block.heading ? (
        <SectionHeading id="process-heading" title={block.heading} lead={block.lead} />
      ) : null}
      <ProcessSteps steps={steps} />
    </Section>
  )
}
