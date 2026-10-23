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
        'eyebrow inline-flex items-center gap-3 text-eyebrow font-bold uppercase',
        inverse ? 'text-[#f0c56a]' : 'text-accent-text',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('h-px w-7', inverse ? 'bg-[#e0a32e]' : 'bg-accent')} />
      {children}
    </Tag>
  )
}
