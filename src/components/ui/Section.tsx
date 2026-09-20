import { cn } from '@/lib/cn'
import { Container } from './Container'
import { Eyebrow } from './Eyebrow'

import type { ReactNode } from 'react'

type Tone = 'default' | 'sunken' | 'tint' | 'inverse' | 'none'

const TONE_CLASS: Record<Tone, string> = {
  default: 'bg-surface',
  sunken: 'bg-surface-sunken',
  tint: 'bg-surface-tint-soft',
  inverse: 'bg-gradient-deep text-text-on-inverse',
  none: '',
}

export function Section({
  children,
  tone = 'default',
  className,
  id,
  labelledBy,
  bleed = false,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  id?: string
  labelledBy?: string
  /** Render children without the page container (for full-width layouts). */
  bleed?: boolean
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn('py-16 md:py-24', TONE_CLASS[tone], className)}
    >
      {bleed ? children : <Container>{children}</Container>}
    </section>
  )
}

/**
 * Heading row for a section: eyebrow, title, lead, and an optional action
 * (usually a "see all" link) that sits at the end of the row on wide screens.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  inverse = false,
  action,
  align = 'start',
  className,
}: {
  id?: string
  eyebrow?: string | null
  title: string
  lead?: string | null
  inverse?: boolean
  action?: ReactNode
  align?: 'start' | 'center'
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between',
        align === 'center' && 'md:flex-col md:items-center md:text-center',
        className,
      )}
    >
      <div className={cn('max-w-[var(--measure)]', align === 'center' && 'mx-auto')}>
        {eyebrow ? (
          <Eyebrow inverse={inverse} className="mb-3">
            {eyebrow}
          </Eyebrow>
        ) : null}
        <h2 id={id} className={cn(inverse && 'text-white')}>
          {title}
        </h2>
        {lead ? (
          <p className={cn('mt-4 text-body-lg', inverse ? 'text-brand-100' : 'text-text-muted')}>
            {lead}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
