import { cn } from '@/lib/cn'
import { Container } from './Container'

import type { ReactNode } from 'react'

type Tone = 'default' | 'sunken' | 'tint' | 'inverse'

const TONE_CLASS: Record<Tone, string> = {
  default: 'bg-[var(--surface)]',
  sunken: 'bg-[var(--surface-sunken)]',
  tint: 'bg-[var(--surface-tint)]',
  inverse: 'bg-[var(--surface-inverse)] text-[var(--text-on-inverse)]',
}

export function Section({
  children,
  tone = 'default',
  className,
  id,
  labelledBy,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  id?: string
  labelledBy?: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn('py-14 md:py-20', TONE_CLASS[tone], className)}
    >
      <Container>{children}</Container>
    </section>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  inverse = false,
}: {
  id?: string
  eyebrow?: string | null
  title: string
  lead?: string | null
  inverse?: boolean
}) {
  return (
    <div className="mb-10 max-w-[var(--measure)]">
      {eyebrow ? (
        <p
          className={cn(
            'mb-2 text-caption font-semibold tracking-wide uppercase',
            inverse ? 'text-[var(--brand-300)]' : 'text-[var(--accent-text)]',
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 id={id} className={cn(inverse && 'text-[var(--text-on-inverse)]')}>
        {title}
      </h2>
      {lead ? (
        <p
          className={cn(
            'mt-3 text-body-lg',
            inverse ? 'text-[var(--brand-100)]' : 'text-[var(--text-muted)]',
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  )
}
