import Image from 'next/image'

import { FieldSlideshow, type Slide } from '@/components/FieldSlideshow'
import { FIELD_KINDS } from '@/collections/FieldMoments'
import { formatMonth, isoDate } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { mediaSrc } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { FieldMoment, Media } from '@/payload-types'

/** The cover of a visit: its first photo, at card size. */
function cover(moment: FieldMoment): { src: string; alt: string } | null {
  const first = moment.photos?.[0]
  const media = typeof first === 'object' ? (first as Media) : null
  const src = mediaSrc(media, 'card')
  return src ? { src, alt: media?.alt || moment.title } : null
}

/**
 * One card per kind of visit — office meetings, fairs, factories — whose
 * photo rotates through a different client or visit each time, with that
 * visit's title over it. Several shots of the same person would say nothing
 * new; many different clients is the point.
 */
export function FieldGroups({
  moments,
  locale,
  kindLabel,
  countLabel,
  className,
}: {
  moments: FieldMoment[]
  locale: Locale
  kindLabel: (kind: FieldMoment['kind']) => string
  countLabel: (count: number) => string
  className?: string
}) {
  const groups = FIELD_KINDS.map((kind) => {
    const items = moments.filter((moment) => moment.kind === kind)
    // Picks for the homepage lead the rotation; the rest follow, newest first.
    items.sort((a, b) => Number(Boolean(b.showOnHome)) - Number(Boolean(a.showOnHome)))
    const slides = items.flatMap((moment): Slide[] => {
      const image = cover(moment)
      return image
        ? [
            {
              ...image,
              caption: moment.title,
              note: moment.takenAt ? formatMonth(moment.takenAt, locale) : undefined,
            },
          ]
        : []
    })
    return { kind, slides }
  }).filter((group) => group.slides.length > 0)

  return (
    <ul
      className={cn(
        'grid list-none gap-5 p-0 sm:grid-cols-2',
        groups.length >= 3 && 'lg:grid-cols-3',
        className,
      )}
    >
      {groups.map(({ kind, slides }) => (
        <li key={kind} data-reveal>
          <div className="relative">
            <FieldSlideshow
              slides={slides}
              label={kindLabel(kind)}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="aspect-[4/5] rounded-xl bg-surface-sunken"
            />
            <span className="pointer-events-none absolute top-3 start-3 rounded-full bg-white/92 px-3 py-1 text-eyebrow font-bold text-brand-900 shadow-sm">
              {kindLabel(kind)}
            </span>
            <span className="pointer-events-none absolute top-3 end-3 rounded-full bg-black/55 px-2.5 py-1 text-caption font-semibold text-white">
              <bdi>{countLabel(slides.length)}</bdi>
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Every visit of one kind as a still card: its cover photo and title. */
export function FieldGallery({
  moments,
  locale,
  className,
}: {
  moments: FieldMoment[]
  locale: Locale
  className?: string
}) {
  return (
    <ul className={cn('grid list-none grid-cols-2 gap-3 p-0 sm:gap-5 lg:grid-cols-4', className)}>
      {moments.map((moment) => {
        const image = cover(moment)
        if (!image) return null
        return (
          <li key={moment.id} data-reveal>
            <figure className="m-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-sunken">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 text-body leading-snug font-semibold text-heading">
                {moment.title}
                {moment.takenAt ? (
                  <span className="mt-1 block text-caption font-normal text-text-muted">
                    <bdi>
                      <time dateTime={isoDate(moment.takenAt)}>
                        {formatMonth(moment.takenAt, locale)}
                      </time>
                    </bdi>
                  </span>
                ) : null}
              </figcaption>
            </figure>
          </li>
        )
      })}
    </ul>
  )
}
