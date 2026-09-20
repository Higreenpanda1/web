import { Quote } from 'lucide-react'

import { Card } from '@/components/ui/Card'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getTestimonials } from '@/lib/queries'

import type { Locale } from '@/i18n/routing'
import type { Page, Testimonial } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'testimonials' }>

export async function TestimonialsBlock({ block, locale }: { block: Block; locale: Locale }) {
  const items = await resolve(block, locale)
  if (items.length === 0) return null

  return (
    <Section labelledBy={block.heading ? 'testimonials-heading' : undefined}>
      {block.heading ? <SectionHeading id="testimonials-heading" title={block.heading} /> : null}
      <ul className="grid list-none gap-5 p-0 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card as="li" key={item.id}>
            <figure className="flex h-full flex-col">
              <Quote
                size={26}
                strokeWidth={1.5}
                aria-hidden="true"
                className="mb-3 text-[var(--brand-400)] rtl:-scale-x-100"
              />
              <blockquote className="flex-1 text-body-lg">{item.quote}</blockquote>
              <figcaption className="mt-4 text-caption text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text)]">{item.author}</span>
                {item.role ? <span> — {item.role}</span> : null}
              </figcaption>
            </figure>
          </Card>
        ))}
      </ul>
    </Section>
  )
}

async function resolve(block: Block, locale: Locale): Promise<Testimonial[]> {
  if (block.source === 'manual') {
    return (block.testimonials ?? []).filter(
      (entry): entry is Testimonial => typeof entry === 'object' && entry !== null,
    )
  }
  return getTestimonials(locale, true)
}
