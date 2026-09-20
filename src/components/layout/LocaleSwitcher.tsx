'use client'

import { useTransition } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { Locale } from '@/i18n/routing'

/**
 * The switcher stays on the equivalent page — a requirement in the build prompt
 * and the most common thing bilingual sites get wrong. `usePathname` from
 * next-intl returns the path *without* the locale prefix, and slugs are shared
 * across locales by design, so the same path is valid in both languages and
 * nothing has to be looked up or mapped.
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
        'inline-flex min-h-11 items-center rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-caption font-semibold text-[var(--text)] no-underline transition-colors hover:bg-[var(--surface-tint)]',
        isPending && 'opacity-60',
        className,
      )}
    >
      {switchTo}
      {/* WCAG 2.5.3 Label in Name: the accessible name has to contain the
          visible text, so the purpose is appended rather than replacing it.
          An aria-label of "تغيير اللغة" on a control reading "English" means
          a speech-input user cannot say what they can see. */}
      <span className="sr-only">&nbsp;{label}</span>
    </Link>
  )
}
