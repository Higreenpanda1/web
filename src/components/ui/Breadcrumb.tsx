import { ChevronRight } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

/**
 * The chevron is mirrored by the RTL variant rather than swapped in code —
 * "deeper into the site" is the same idea in both languages, it just points
 * the other way. The last item is the current page and is not a link.
 */
export function Breadcrumb({
  items,
  label,
  inverse = false,
  className,
}: {
  items: Array<{ name: string; href?: string }>
  label: string
  inverse?: boolean
  className?: string
}) {
  return (
    <nav aria-label={label} className={cn('text-caption', className)}>
      <ol className="flex list-none flex-wrap items-center gap-1.5 p-0">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.name}-${index}`} className="inline-flex items-center gap-1.5">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className={cn(
                    'no-underline hover:underline',
                    inverse
                      ? 'text-brand-300 hover:text-white'
                      : 'text-text-muted hover:text-text-brand',
                  )}
                >
                  {item.name}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={cn('font-semibold', inverse ? 'text-white' : 'text-text')}
                >
                  {item.name}
                </span>
              )}
              {!last ? (
                <ChevronRight
                  size={15}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className={cn(
                    'rtl:-scale-x-100',
                    inverse ? 'text-brand-400' : 'text-border-strong',
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
