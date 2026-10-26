'use client'

import { Languages } from 'lucide-react'
import { useTransition } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { locales, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/cn'

/** Each language in its own script, the way a reader of it looks for it. */
const NATIVE_NAMES: Record<Locale, string> = { ar: 'العربية', en: 'English', zh: '中文' }

/**
 * The switcher stays on the equivalent page — a requirement in the build prompt
 * and the most common thing multilingual sites get wrong. `usePathname` from
 * next-intl returns the path *without* the locale prefix, and slugs are shared
 * across locales by design, so the same path is valid in every language.
 *
 * With three languages it offers the other two side by side rather than a
 * menu: one tap, no JavaScript needed to open anything.
 */
export function LocaleSwitcher({
  locale,
  label,
  className,
}: {
  locale: Locale
  label: string
  className?: string
}) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const targets = locales.filter((other) => other !== locale)

  return (
    <nav
      aria-label={label}
      className={cn(
        'inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-surface ps-3 pe-1.5 py-1 text-caption font-semibold text-text',
        isPending && 'opacity-60',
        className,
      )}
    >
      <Languages size={17} strokeWidth={1.75} aria-hidden="true" className="text-text-brand" />
      {targets.map((target) => (
        <Link
          key={target}
          href={pathname}
          locale={target}
          hrefLang={target}
          lang={target}
          onNavigate={() => startTransition(() => {})}
          className="rounded-full px-2 py-1 text-text no-underline transition-colors hover:bg-surface-tint-soft hover:text-text-brand"
        >
          {NATIVE_NAMES[target]}
        </Link>
      ))}
    </nav>
  )
}
