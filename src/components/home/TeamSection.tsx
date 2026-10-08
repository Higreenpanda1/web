import Image from 'next/image'

import { PlayMark } from '@/components/layout/Logo'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { mediaSrc } from '@/lib/seo'

import type { Media, TeamMember } from '@/payload-types'
import type { ReactNode } from 'react'

const photoOf = (member: TeamMember) =>
  typeof member.photo === 'object' ? (member.photo as Media) : null

/**
 * The homepage team: the founder first, on a wide card that sends the visitor
 * to About for the full story, then everyone else underneath. Names, roles and
 * photos all come from the Team collection, so the owner adds or removes
 * people in the CMS. Without a photo a card shows the person's initial on the
 * brand green rather than an empty frame.
 */
export function TeamSection({
  founder,
  others,
  eyebrow,
  heading,
  lead,
  founderSummary,
  founderActions,
}: {
  founder: TeamMember | null
  others: TeamMember[]
  eyebrow: string
  heading: string
  lead: string
  /** One line for the homepage; the full bio and credentials live on About. */
  founderSummary: string
  founderActions?: ReactNode
}) {
  const founderPhoto = founder ? photoOf(founder) : null
  const founderSrc = mediaSrc(founderPhoto, 'card')

  return (
    <div>
      <div className="mb-10 max-w-[var(--measure)] md:mb-12">
        <Eyebrow className="mb-3">{eyebrow}</Eyebrow>
        <h2 id="home-team-heading">{heading}</h2>
        <p className="mt-4 text-body-lg text-text-muted">{lead}</p>
      </div>

      {founder ? (
        <div
          data-reveal
          className="grid items-center gap-6 rounded-2xl border border-border-soft bg-surface p-5 shadow-card sm:grid-cols-[11rem_1fr] sm:gap-8 md:p-8 lg:grid-cols-[13rem_1fr]"
        >
          {founderSrc ? (
            <Image
              src={founderSrc}
              alt={founderPhoto?.alt ?? founder.name}
              width={768}
              height={960}
              sizes="(min-width: 1024px) 13rem, (min-width: 640px) 11rem, 100vw"
              className="aspect-[4/5] w-full max-w-[13rem] rounded-xl object-cover object-[50%_20%]"
            />
          ) : (
            <div
              role="img"
              aria-label={founder.name}
              className="relative flex aspect-[4/5] w-full max-w-[13rem] items-center justify-center overflow-hidden rounded-xl bg-gradient-deep"
            >
              <div className="absolute inset-0 bg-dots-inverse opacity-50" aria-hidden="true" />
              <PlayMark onDark size={72} className="relative" />
            </div>
          )}
          <div>
            <h3>{founder.name}</h3>
            <p className="text-text-muted">{founder.role}</p>
            <p className="mt-4 max-w-[var(--measure)]">{founderSummary}</p>
            {founderActions ? (
              <div className="mt-6 flex flex-wrap gap-3">{founderActions}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {others.length > 0 ? (
        <ul className="mt-6 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-6">
          {others.map((member) => {
            const photo = photoOf(member)
            const src = mediaSrc(photo, 'thumbnail')
            return (
              <li
                key={member.id}
                data-reveal
                className="flex flex-col items-center rounded-xl border border-border-soft bg-surface p-5 text-center shadow-card"
              >
                {src ? (
                  <Image
                    src={src}
                    alt={photo?.alt ?? member.name}
                    width={320}
                    height={320}
                    sizes="96px"
                    className="size-20 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex size-20 items-center justify-center rounded-full bg-surface-tint text-h3 font-bold text-text-brand"
                  >
                    {member.name.trim().charAt(0)}
                  </span>
                )}
                <h3 className="mt-4 text-body-lg font-bold">{member.name}</h3>
                <p className="mt-1 text-caption text-text-muted">{member.role}</p>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
