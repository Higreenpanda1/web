import { FounderCard } from '@/components/home/FounderCard'
import { Section } from '@/components/ui/Section'
import { BlockActions } from './BlockActions'

import type { Page, TeamMember } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'founder' }>

/**
 * The audience follows the person, not just the company (brief section 3).
 * The credentials come from the CMS record rather than being written into
 * the markup, so "235+ cities" stays true as it grows.
 */
export function FounderBlock({ block }: { block: Block }) {
  const member = typeof block.member === 'object' ? (block.member as TeamMember) : null
  if (!member) return null

  return (
    <Section tone="tint">
      <FounderCard
        member={member}
        heading={block.heading}
        actions={
          block.actions && block.actions.length > 0 ? (
            <BlockActions actions={block.actions} />
          ) : undefined
        }
      />
    </Section>
  )
}
