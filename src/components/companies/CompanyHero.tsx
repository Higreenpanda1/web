import { PlayMark } from '@/components/layout/Logo'
import { Container } from '@/components/ui/Container'
import { HighlightScope } from './HighlightScope'

import type { ReactNode } from 'react'

/**
 * The opening band of a company page (/higp, /nasher): the company's name
 * in gold above the page title, then the lead with its highlighted phrases
 * and the page's actions. Same deep green as the homepage.
 */
export function CompanyHero({
  name,
  title,
  lead,
  breadcrumb,
  children,
}: {
  name: string
  title: string
  lead: ReactNode
  breadcrumb?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="theme-deep relative isolate overflow-hidden bg-gradient-deep">
      <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden="true" />
      <PlayMark
        size={520}
        className="pointer-events-none absolute -top-40 -end-40 -z-10 opacity-[0.07]"
      />
      <Container className="py-12 md:py-20">
        {breadcrumb ? <div className="mb-6">{breadcrumb}</div> : null}
        <HighlightScope className="max-w-[52rem]">
          <p className="reveal inline-flex items-center gap-2.5 rounded-full border border-border-strong px-4 py-1.5 text-caption">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-brand-300 shadow-[0_0_0_4px_rgb(159_214_167/0.15)]"
            />
            <span className="co-name">{name}</span>
          </p>
          <h1 className="reveal reveal-1 mt-5 text-display">{title}</h1>
          <p className="reveal reveal-2 mt-5 max-w-[var(--measure)] text-body-lg text-text-muted">
            {lead}
          </p>
          {children ? <div className="reveal reveal-3 mt-8">{children}</div> : null}
        </HighlightScope>
      </Container>
    </section>
  )
}
