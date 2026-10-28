import { PlayMark } from '@/components/layout/Logo'
import { cn } from '@/lib/cn'
import { Container } from './Container'
import { Eyebrow } from './Eyebrow'

import type { ReactNode } from 'react'

/**
 * The header band for inner pages, on the course page's deep green (owner,
 * 23 October 2026), with a large, very quiet play mark on the trailing side
 * so the brand is present without shouting. The page below it stays light. `children` is for anything below the lead — buttons, a form link.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  breadcrumb,
  icon,
  children,
  after,
  className,
  size = 'md',
}: {
  eyebrow?: string | null
  title: string
  lead?: string | null
  breadcrumb?: ReactNode
  icon?: ReactNode
  children?: ReactNode
  /** Full container width, below the text column (the services page's company cards). */
  after?: ReactNode
  className?: string
  size?: 'md' | 'lg'
}) {
  return (
    <section
      className={cn('theme-deep relative isolate overflow-hidden bg-gradient-deep', className)}
    >
      <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden="true" />
      <PlayMark
        size={520}
        className="pointer-events-none absolute -top-40 -end-40 -z-10 opacity-[0.07]"
      />
      <Container className={cn('relative', size === 'lg' ? 'py-16 md:py-24' : 'py-12 md:py-18')}>
        {breadcrumb ? <div className="mb-6">{breadcrumb}</div> : null}
        <div className="max-w-[52rem]">
          {icon ? (
            <span className="mb-5 inline-flex size-16 items-center justify-center rounded-lg bg-brand-700 text-white shadow-glow">
              {icon}
            </span>
          ) : null}
          {eyebrow ? <Eyebrow className="mb-3">{eyebrow}</Eyebrow> : null}
          <h1 className={cn(size === 'lg' && 'text-display')}>{title}</h1>
          {lead ? (
            <p className="mt-5 max-w-[var(--measure)] text-body-lg text-text-muted">{lead}</p>
          ) : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
        {after ? <div className="mt-10">{after}</div> : null}
      </Container>
    </section>
  )
}
