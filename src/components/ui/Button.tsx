import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'outline-inverse'
type Size = 'md' | 'lg'

/**
 * WCAG note (brief section 12): white text on --brand-600 is 4.16:1, which
 * fails AA at normal size. The primary button therefore uses --brand-700
 * (6.48:1) for its fill, not the logo green. The two greens are close enough
 * that nothing is lost visually, and the labels stay readable on a phone in
 * direct sunlight.
 */
const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    'bg-[var(--brand-700)] text-white hover:bg-[var(--brand-800)] active:bg-[var(--brand-900)]',
  secondary:
    'bg-transparent text-[var(--text-brand)] border border-[var(--brand-700)] hover:bg-[var(--brand-100)]',
  ghost: 'bg-transparent text-[var(--text-brand)] hover:bg-[var(--brand-100)]',
  inverse: 'bg-white text-[var(--brand-800)] hover:bg-[var(--brand-100)]',
  // For a dark or photographic background. A real variant rather than adding
  // `text-…` on top of `secondary`: both would set the same property, Tailwind's
  // emission order would decide the winner, and the losing case here was
  // --brand-700 green on --brand-900 green, which Lighthouse correctly failed
  // for contrast.
  'outline-inverse':
    'bg-transparent text-white border border-[var(--brand-400)] hover:bg-[var(--brand-800)]',
}

const SIZE_CLASS: Record<Size, string> = {
  md: 'px-5 py-2.5 text-body',
  lg: 'px-7 py-3.5 text-body-lg',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-semibold no-underline transition-colors duration-150 min-h-11'

type CommonProps = {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  external,
  ...rest
}: CommonProps & { href: string; external?: boolean } & Omit<
    ComponentProps<'a'>,
    'href' | 'className' | 'children'
  >) {
  const classes = cn(BASE, VARIANT_CLASS[variant], SIZE_CLASS[size], className)

  if (
    external ||
    href.startsWith('http') ||
    href.startsWith('tel:') ||
    href.startsWith('mailto:')
  ) {
    return (
      <a
        href={href}
        className={classes}
        {...(href.startsWith('http') ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
        {...rest}
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: CommonProps & Omit<ComponentProps<'button'>, 'className' | 'children'>) {
  return (
    <button
      className={cn(
        BASE,
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
