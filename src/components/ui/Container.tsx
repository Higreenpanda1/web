import { cn } from '@/lib/cn'

import type { ReactNode } from 'react'

export function Container({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'header' | 'footer' | 'main' | 'nav'
}) {
  return <Tag className={cn('container-page', className)}>{children}</Tag>
}
