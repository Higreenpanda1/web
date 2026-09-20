import { StatsBand } from '@/components/home/StatsBand'
import { Container } from '@/components/ui/Container'

import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'stats' }>

export function StatsBlock({ block }: { block: Block }) {
  const items = (block.items ?? []).map((item) => ({ value: item.value, label: item.label }))
  if (items.length === 0) return null

  return (
    <section
      className="bg-surface py-8 md:py-10"
      aria-labelledby={block.heading ? 'stats-heading' : undefined}
    >
      <Container>
        <StatsBand heading={block.heading} items={items} />
        {block.heading ? (
          <h2 id="stats-heading" className="sr-only">
            {block.heading}
          </h2>
        ) : null}
      </Container>
    </section>
  )
}
