'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

/**
 * A primary-navigation link that knows when it is the current page. The
 * pathname from next-intl has no locale prefix, so `/services` matches in
 * both languages, and a service detail page still lights up "Services".
 */
export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active =
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative inline-flex min-h-11 items-center rounded-full px-4 py-2 font-semibold no-underline transition-colors',
        active
          ? 'bg-surface-tint text-heading'
          : 'text-text hover:bg-surface-tint-soft hover:text-text-brand',
      )}
    >
      {label}
    </Link>
  )
}
