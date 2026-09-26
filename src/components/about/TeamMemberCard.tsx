import Image from 'next/image'

import { cn } from '@/lib/cn'
import { mediaSrc } from '@/lib/seo'

import type { Media, TeamMember } from '@/payload-types'

/**
 * One person on the About page team sheet: the photo on white, the name and
 * role on a band of brand green underneath. `featured` is the founder's
 * larger card in the middle column.
 */
export function TeamMemberCard({
  member,
  featured = false,
  as: Tag = 'div',
  className,
}: {
  member: TeamMember
  featured?: boolean
  as?: 'div' | 'li'
  className?: string
}) {
  const photo = typeof member.photo === 'object' ? (member.photo as Media) : null
  const src = mediaSrc(photo, featured ? 'card' : 'thumbnail')

  return (
    <Tag
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-border-soft bg-surface shadow-card',
        className,
      )}
    >
      <div className={cn('flex justify-center bg-surface', featured ? 'p-6 pb-0' : 'p-3 pb-3')}>
        {src ? (
          <Image
            src={src}
            alt={photo?.alt ?? member.name}
            width={featured ? 768 : 320}
            height={featured ? 1040 : 320}
            sizes={featured ? '(min-width: 1024px) 560px, 100vw' : '320px'}
            className={cn(
              'object-cover object-top',
              featured ? 'aspect-[3/4] w-full max-w-md' : 'aspect-square w-full max-w-60',
            )}
          />
        ) : null}
      </div>
      <div className="bg-brand-900 px-4 py-3 text-center text-white">
        <h3 className={cn('text-white', featured ? 'text-h2' : 'text-h3')}>{member.name}</h3>
        <p className={cn('text-white/85', featured ? 'mt-1' : 'text-caption')}>{member.role}</p>
      </div>
    </Tag>
  )
}
