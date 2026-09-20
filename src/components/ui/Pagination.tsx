import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Link } from '@/i18n/navigation'

/**
 * Previous/next rather than a numbered list: on a phone a row of page numbers
 * is a tap-target problem, and the blog is a feed, not a catalogue.
 *
 * The chevrons are mirrored by the RTL variant rather than swapped in code —
 * "previous" is the same concept in both languages, it just points the other
 * way, and `rtl:-scale-x-100` is the honest expression of that.
 */
export function Pagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: number
  total: number
  basePath: string
  labels: { previous: string; next: string; nav: string; page: string }
}) {
  if (total <= 1) return null

  const hasPrevious = current > 1
  const hasNext = current < total

  return (
    <nav aria-label={labels.nav} className="mt-12 flex items-center justify-between gap-4">
      {hasPrevious ? (
        <Link
          href={current - 1 === 1 ? basePath : `${basePath}?page=${current - 1}`}
          rel="prev"
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-[var(--text-brand)] no-underline"
        >
          <ChevronLeft
            size={20}
            strokeWidth={1.5}
            aria-hidden="true"
            className="rtl:-scale-x-100"
          />
          {labels.previous}
        </Link>
      ) : (
        <span />
      )}

      <p className="ltr-nums text-caption text-[var(--text-muted)]">{labels.page}</p>

      {hasNext ? (
        <Link
          href={`${basePath}?page=${current + 1}`}
          rel="next"
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-[var(--text-brand)] no-underline"
        >
          {labels.next}
          <ChevronRight
            size={20}
            strokeWidth={1.5}
            aria-hidden="true"
            className="rtl:-scale-x-100"
          />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
