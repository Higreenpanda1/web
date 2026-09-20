import { cn } from '@/lib/cn'

import type { ReactNode } from 'react'

/**
 * The one card. `interactive` adds the hover lift and a green border for
 * cards that are, in their entirety, a link.
 */
export function Card({
  children,
  className,
  as: Tag = 'div',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'li' | 'section'
  interactive?: boolean
}) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-border-soft bg-surface p-6 shadow-card',
        interactive && 'lift hover:border-brand-300 hover:shadow-float',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
