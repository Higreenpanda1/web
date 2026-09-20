import { cn } from '@/lib/cn'

import type { ReactNode } from 'react'

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'li'
}) {
  return (
    <Tag
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm transition-shadow',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
