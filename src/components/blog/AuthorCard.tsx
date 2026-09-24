import { ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'

import { PlayMark } from '@/components/layout/Logo'
import { Link } from '@/i18n/navigation'
import { mediaSrc } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Media, TeamMember } from '@/payload-types'

/**
 * Who wrote this and why they can. Search engines weigh an article by the
 * person behind it, and this audience follows the founder rather than the
 * company (brief section 3) — so the byline is a card with the credentials,
 * not a name in grey.
 */
export function AuthorCard({
  member,
  locale,
  title,
  moreLabel,
}: {
  member: TeamMember
  locale: Locale
  title: string
  moreLabel: string
}) {
  const photo = typeof member.photo === 'object' ? (member.photo as Media) : null
  const src = mediaSrc(photo, 'thumbnail')
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight
  const credentials = (member.credentials ?? []).slice(0, 3)

  return (
    <aside
      aria-labelledby="author-heading"
      className="rounded-lg border border-border-soft bg-surface p-6 shadow-card"
    >
      <p
        id="author-heading"
        className="text-eyebrow font-bold tracking-[0.14em] text-text-brand uppercase"
      >
        {title}
      </p>
      <div className="mt-4 flex items-start gap-4">
        {src ? (
          <Image
            src={src}
            alt={photo?.alt ?? member.name}
            width={72}
            height={72}
            className="size-[72px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-deep"
          >
            <PlayMark onDark size={36} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-h3 font-bold text-heading">{member.name}</p>
          <p className="text-caption text-text-muted">{member.role}</p>
          {member.bio ? <p className="mt-3 text-caption">{member.bio}</p> : null}
          {credentials.length > 0 ? (
            <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
              {credentials.map((item, index) => (
                <li
                  key={item.id ?? index}
                  className="rounded-full bg-surface-tint px-3 py-1 text-eyebrow font-semibold text-brand-900"
                >
                  {item.text}
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            href="/about"
            className="mt-4 inline-flex items-center gap-1.5 text-caption font-semibold text-text-brand"
          >
            {moreLabel}
            <Arrow size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  )
}
