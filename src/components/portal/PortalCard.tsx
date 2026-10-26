import { Container } from '@/components/ui/Container'

import type { ReactNode } from 'react'

/** The sign-in pages: one card on the site's deep green, nothing else to distract. */
export function PortalCard({
  title,
  lead,
  children,
}: {
  title: string
  lead?: string
  children: ReactNode
}) {
  return (
    <section className="relative isolate bg-gradient-deep py-14 md:py-24">
      <div className="absolute inset-0 -z-10 bg-dots-inverse opacity-30" aria-hidden="true" />
      <Container>
        <div className="mx-auto max-w-md rounded-xl bg-surface p-6 shadow-float md:p-9">
          <h1 className="text-h2 text-heading">{title}</h1>
          {lead ? <p className="mt-2 text-text-muted">{lead}</p> : null}
          <div className="mt-7">{children}</div>
        </div>
      </Container>
    </section>
  )
}
