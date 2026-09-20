import { Quote } from 'lucide-react'
import Image from 'next/image'

import { Card } from '@/components/ui/Card'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getTestimonials } from '@/lib/queries'
import { mediaUrl } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Media, Page, Testimonial } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'testimonials' }>

export async function TestimonialsBlock({ block, locale }: { block: Block; locale: Locale }) {
  const items = await resolve(block, locale)
  if (items.length === 0) return null

  return (
    <Section tone="sunken" labelledBy={block.heading ? 'testimonials-heading' : undefined}>
      {block.heading ? <SectionHeading id="testimonials-heading" title={block.heading} /> : null}
      <ul className="grid list-none gap-5 p-0 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const avatar = typeof item.avatar === 'object' ? (item.avatar as Media) : null
          const src = mediaUrl(avatar, 'thumbnail')
          return (
            <Card as="li" key={item.id}>
              <figure className="flex h-full flex-col">
                <Quote
                  size={28}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="mb-4 text-brand-500 rtl:-scale-x-100"
                />
                <blockquote className="flex-1 text-body-lg text-heading">{item.quote}</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border-soft pt-5">
                  {src ? (
                    <Image
                      src={src}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="inline-flex size-11 items-center justify-center rounded-full bg-surface-tint font-bold text-brand-800"
                    >
                      {item.author.slice(0, 1)}
                    </span>
                  )}
                  <span className="text-caption">
                    <span className="block font-semibold text-text">{item.author}</span>
                    {item.role ? <span className="text-text-muted">{item.role}</span> : null}
                  </span>
                </figcaption>
              </figure>
            </Card>
          )
        })}
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
