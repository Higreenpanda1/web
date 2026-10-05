import Image from 'next/image'

import { formatMonth, isoDate } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { mediaSrc } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { FieldMoment, Media } from '@/payload-types'

/**
 * A grid of real field photos with one line under each. Portrait 4:5 tiles,
 * the same shape the photos are taken in on a phone, so faces are not cropped
 * off at the top the way a 16:9 card would.
 */
export function FieldGallery({
  moments,
  locale,
  kindLabel,
  className,
}: {
  moments: FieldMoment[]
  locale: Locale
  /** Shown as a small badge on each photo; omitted on the grouped page. */
  kindLabel?: (kind: FieldMoment['kind']) => string
  className?: string
}) {
  return (
    <ul className={cn('grid list-none grid-cols-2 gap-3 p-0 sm:gap-5 lg:grid-cols-3', className)}>
      {moments.map((moment) => {
        const image = typeof moment.image === 'object' ? (moment.image as Media) : null
        const src = mediaSrc(image, 'card')
        if (!src) return null
        return (
          <li key={moment.id} data-reveal>
            <figure className="m-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-sunken">
                <Image
                  src={src}
                  alt={image?.alt || moment.caption}
                  width={768}
                  height={960}
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="size-full object-cover"
                />
                {kindLabel ? (
                  <span className="absolute top-3 start-3 rounded-full bg-white/92 px-3 py-1 text-eyebrow font-bold text-brand-900 shadow-sm">
                    {kindLabel(moment.kind)}
                  </span>
                ) : null}
              </div>
              <figcaption className="mt-3 text-body leading-snug font-semibold text-heading">
                {moment.caption}
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
