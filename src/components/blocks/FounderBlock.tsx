import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'

import { Section } from '@/components/ui/Section'
import { mediaUrl } from '@/lib/seo'
import { BlockActions } from './BlockActions'

import type { Media, Page, TeamMember } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'founder' }>

/**
 * The audience follows the person, not just the company (brief section 3), and
 * the old site under-used that. The credentials come from the CMS record rather
 * than being written into the markup, so "235+ cities" stays true as it grows.
 */
export function FounderBlock({ block }: { block: Block }) {
  const member = typeof block.member === 'object' ? (block.member as TeamMember) : null
  if (!member) return null

  const photo = typeof member.photo === 'object' ? (member.photo as Media) : null
  const src = mediaUrl(photo, 'card')

  return (
    <Section tone="tint">
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,18rem)_1fr]">
        {src ? (
          <Image
            src={src}
            alt={photo?.alt ?? member.name}
            width={photo?.width ?? 768}
            height={photo?.height ?? 768}
            sizes="(min-width: 768px) 18rem, 100vw"
            className="aspect-square rounded-[var(--radius-lg)] object-cover"
          />
        ) : null}

        <div>
          {block.heading ? <h2>{block.heading}</h2> : null}
          <p className="mt-3 text-h3 font-semibold text-[var(--heading)]">{member.name}</p>
          <p className="text-[var(--text-muted)]">{member.role}</p>
          {member.bio ? (
            <p className="mt-4 max-w-[var(--measure)] text-body-lg">{member.bio}</p>
          ) : null}

          {member.credentials && member.credentials.length > 0 ? (
            <ul className="mt-6 grid list-none gap-2 p-0 sm:grid-cols-2">
              {member.credentials.map((item, index) => (
                <li key={item.id ?? index} className="flex items-start gap-2">
                  <CheckCircle2
                    size={20}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[var(--brand-700)]"
                  />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <BlockActions actions={block.actions} />
        </div>
      </div>
    </Section>
  )
}
