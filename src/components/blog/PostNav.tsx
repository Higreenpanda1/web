import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Link } from '@/i18n/navigation'

import type { Post } from '@/payload-types'

/**
 * Older and newer article. Internal links between articles are what let a
 * crawler — and a reader — move through the archive without going back to the
 * index every time; with two hundred articles that matters.
 */
export function PostNav({
  previous,
  next,
  labels,
}: {
  previous: Post | null
  next: Post | null
  labels: { previous: string; next: string }
}) {
  if (!previous && !next) return null

  const linkClass =
    'group flex min-h-24 flex-1 flex-col justify-center gap-1 rounded-lg border border-border-soft bg-surface p-5 no-underline transition-colors hover:border-brand-300 hover:bg-surface-tint-soft'

  return (
    <nav className="grid gap-4 sm:grid-cols-2">
      {previous ? (
        <Link href={`/blog/${previous.slug}`} rel="prev" className={linkClass}>
          <span className="inline-flex items-center gap-1 text-eyebrow font-bold tracking-[0.14em] text-text-muted uppercase">
            <ChevronLeft
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              className="rtl:-scale-x-100"
            />
            {labels.previous}
          </span>
          <span className="font-semibold text-heading group-hover:text-text-brand">
            {previous.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/blog/${next.slug}`} rel="next" className={`${linkClass} sm:text-end`}>
          <span className="inline-flex items-center gap-1 text-eyebrow font-bold tracking-[0.14em] text-text-muted uppercase sm:justify-end">
            {labels.next}
            <ChevronRight
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              className="rtl:-scale-x-100"
            />
          </span>
          <span className="font-semibold text-heading group-hover:text-text-brand">
            {next.title}
          </span>
        </Link>
      ) : null}
    </nav>
  )
}
