import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

import type { Category } from '@/payload-types'

/**
 * The twelve categories as a scrollable row of pills. Every pill is a real
 * link to a real page, so the category archives are crawlable and each
 * carries a count — a reader learns what the blog is deep on at a glance.
 */
export function CategoryNav({
  categories,
  counts,
  current,
  allLabel,
  label,
}: {
  categories: Category[]
  counts: Record<number, number>
  current?: string | null
  allLabel: string
  label: string
}) {
  const visible = categories.filter((category) => (counts[category.id] ?? 0) > 0)
  if (visible.length === 0) return null

  const pill = (active: boolean) =>
    cn(
      'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-caption font-semibold no-underline transition-colors',
      active
        ? 'border-brand-700 bg-brand-700 text-white'
        : 'border-border bg-surface text-text hover:border-brand-300 hover:bg-surface-tint-soft',
    )

  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
      <ul className="flex list-none gap-2 p-0">
        <li>
          <Link
            href="/blog"
            className={pill(!current)}
            aria-current={!current ? 'page' : undefined}
          >
            {allLabel}
          </Link>
        </li>
        {visible.map((category) => {
          const active = category.slug === current
          return (
            <li key={category.id}>
              <Link
                href={`/blog/category/${category.slug}`}
                className={pill(active)}
                aria-current={active ? 'page' : undefined}
              >
                {category.title}
                <span
                  className={cn(
                    'ltr-nums rounded-full px-1.5 text-eyebrow',
                    active ? 'bg-white/20' : 'bg-surface-sunken text-text-muted',
                  )}
                >
                  {counts[category.id]}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
