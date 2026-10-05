import { Images } from 'lucide-react'

import { FieldSlideshow, type Slide } from '@/components/FieldSlideshow'
import { formatMonth, isoDate } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { mediaSrc } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { FieldMoment, Media } from '@/payload-types'

/**
 * One card per visit: its photos rotating in a portrait 4:5 frame (the shape
 * they are taken in on a phone, so faces are not cropped off the way a 16:9
 * card would), then the one-line title and the month.
 */
export function FieldGallery({
  moments,
  locale,
  kindLabel,
  className,
}: {
  moments: FieldMoment[]
  locale: Locale
  /** Shown as a small badge on each card; omitted on the grouped page. */
  kindLabel?: (kind: FieldMoment['kind']) => string
  className?: string
}) {
  return (
    <ul className={cn('grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {moments.map((moment) => {
        const slides = (moment.photos ?? []).flatMap((photo): Slide[] => {
          const media = typeof photo === 'object' ? (photo as Media) : null
          const src = mediaSrc(media, 'card')
          return src ? [{ src, alt: media?.alt || moment.title }] : []
        })
        if (slides.length === 0) return null
        return (
          <li key={moment.id} data-reveal>
            <figure className="m-0">
              <div className="relative">
                <FieldSlideshow
                  slides={slides}
                  label={moment.title}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[4/5] rounded-xl bg-surface-sunken"
                />
                {kindLabel ? (
                  <span className="pointer-events-none absolute top-3 start-3 rounded-full bg-white/92 px-3 py-1 text-eyebrow font-bold text-brand-900 shadow-sm">
                    {kindLabel(moment.kind)}
                  </span>
                ) : null}
                {slides.length > 1 ? (
                  <span className="pointer-events-none absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-caption font-semibold text-white">
                    <Images size={14} strokeWidth={2} aria-hidden="true" />
                    <bdi className="ltr-nums">{slides.length}</bdi>
                  </span>
                ) : null}
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
