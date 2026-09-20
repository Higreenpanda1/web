import { cn } from '@/lib/cn'

import type { ReactNode } from 'react'

/** The small label above a heading. One per section; it names the section, not the page. */
export function Eyebrow({
  children,
  inverse = false,
  className,
  as: Tag = 'p',
}: {
  children: ReactNode
  inverse?: boolean
  className?: string
  as?: 'p' | 'span'
}) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center gap-2 text-eyebrow font-bold tracking-[0.14em] uppercase',
        inverse ? 'text-brand-300' : 'text-text-brand',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', inverse ? 'bg-brand-400' : 'bg-brand-600')}
      />
      {children}
    </Tag>
  )
}
