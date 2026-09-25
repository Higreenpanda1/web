import { StatsBand } from '@/components/home/StatsBand'
import { Container } from '@/components/ui/Container'
import { formatCount, getFollowerCounts, type Network } from '@/lib/social-followers'

import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'stats' }>

/** "{instagram}", "{tiktok}", "{youtube}", "{facebook}" or "{total}" become live follower counts. */
const LIVE = /^\{(instagram|tiktok|youtube|facebook|total)\}$/

export async function StatsBlock({ block }: { block: Block }) {
  const raw = block.items ?? []
  const followers = raw.some((item) => LIVE.test(item.value.trim()))
    ? await getFollowerCounts()
    : null
  const items = raw.map((item) => {
    const key = LIVE.exec(item.value.trim())?.[1] as Network | 'total' | undefined
    const live = key && followers ? followers[key] : undefined
    return { value: typeof live === 'number' ? formatCount(live) : item.value, label: item.label }
  })
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
