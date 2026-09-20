'use client'

import { Languages } from 'lucide-react'
import { useTransition } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { Locale } from '@/i18n/routing'

/**
 * The switcher stays on the equivalent page — a requirement in the build prompt
 * and the most common thing bilingual sites get wrong. `usePathname` from
 * next-intl returns the path *without* the locale prefix, and slugs are shared
 * across locales by design, so the same path is valid in both languages.
 */
export function LocaleSwitcher({
  locale,
  label,
  switchTo,
  className,
}: {
  locale: Locale
  label: string
  switchTo: string
  className?: string
}) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const target: Locale = locale === 'ar' ? 'en' : 'ar'

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      lang={target}
      onNavigate={() => startTransition(() => {})}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-caption font-semibold text-text no-underline transition-colors hover:border-brand-300 hover:bg-surface-tint-soft',
        isPending && 'opacity-60',
        className,
      )}
    >
      <Languages size={17} strokeWidth={1.75} aria-hidden="true" className="text-text-brand" />
      {switchTo}
      {/* WCAG 2.5.3 Label in Name: the accessible name has to contain the
          visible text, so the purpose is appended rather than replacing it. */}
      <span className="sr-only">&nbsp;{label}</span>
    </Link>
  )
}
