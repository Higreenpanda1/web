import { Section } from '@/components/ui/Section'

import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'stats' }>

export function StatsBlock({ block }: { block: Block }) {
  const items = block.items ?? []
  if (items.length === 0) return null

  return (
    <Section tone="inverse" labelledBy={block.heading ? 'stats-heading' : undefined}>
      {block.heading ? (
        <h2 id="stats-heading" className="mb-10 text-white">
          {block.heading}
        </h2>
      ) : null}
      <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <div key={item.id ?? index}>
            {/* Western Arabic numerals in both locales, and isolated so an RTL
                paragraph cannot reorder the digits. */}
            <dt className="ltr-nums text-display font-bold text-[var(--brand-400)]">
              {item.value}
            </dt>
            <dd className="mt-1 text-body-lg text-[var(--brand-100)]">{item.label}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
