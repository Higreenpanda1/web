import { CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

import { PlayMark } from '@/components/layout/Logo'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { mediaSrc } from '@/lib/seo'

import type { Media, TeamMember } from '@/payload-types'
import type { ReactNode } from 'react'

/**
 * The founder, as a portrait and a claim list. The audience follows the
 * person, not just the company (brief section 3). Until a photo is uploaded
 * in the CMS the frame holds the brand mark on deep green — designed, not empty.
 */
export function FounderCard({
  member,
  eyebrow,
  heading,
  actions,
}: {
  member: TeamMember
  eyebrow?: string | null
  heading?: string | null
  actions?: ReactNode
}) {
  const photo = typeof member.photo === 'object' ? (member.photo as Media) : null
  const src = mediaSrc(photo, 'card')

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
      <div className="relative mx-auto w-full max-w-[22rem]">
        <div
          aria-hidden="true"
          className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-brand-200 opacity-30 blur-2xl"
        />
        {src ? (
          <Image
            src={src}
            alt={photo?.alt ?? member.name}
            width={768}
            height={960}
            sizes="(min-width: 1024px) 22rem, 100vw"
            className="aspect-[4/5] w-full rounded-xl object-cover object-[50%_20%] shadow-float"
          />
        ) : (
          <div
            role="img"
            aria-label={member.name}
            className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-deep shadow-float"
          >
            <div className="absolute inset-0 bg-dots-inverse opacity-50" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute size-56 rounded-full border border-white/10"
            />
            <span
              aria-hidden="true"
              className="absolute size-80 rounded-full border border-white/5"
            />
            <PlayMark onDark size={120} className="relative" />
          </div>
        )}
      </div>

      <div>
        {eyebrow ? <Eyebrow className="mb-3">{eyebrow}</Eyebrow> : null}
        {heading ? <h2>{heading}</h2> : null}
        <p className="mt-5 text-h3 font-bold text-heading">{member.name}</p>
        <p className="text-text-muted">{member.role}</p>
        {member.bio ? (
          <p className="mt-5 max-w-[var(--measure)] text-body-lg">{member.bio}</p>
        ) : null}

        {member.credentials && member.credentials.length > 0 ? (
          <ul className="mt-7 grid list-none gap-3 p-0 sm:grid-cols-2">
            {member.credentials.map((item, index) => (
              <li
                key={item.id ?? index}
                className="flex items-start gap-2.5 rounded-lg border border-border-soft bg-surface p-3.5"
              >
                <CheckCircle2
                  size={20}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-brand-600"
                />
                <span className="font-medium">{item.text}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  )
}
