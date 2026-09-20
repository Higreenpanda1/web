import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'outline-inverse' | 'soft'
type Size = 'sm' | 'md' | 'lg'

/**
 * WCAG note (brief section 12): white text on --brand-600 is 4.16:1, which
 * fails AA at normal size. The primary button therefore uses --brand-700
 * (6.48:1) for its fill, not the logo green.
 *
 * Buttons are pills: the rounded "i" stem in the wordmark is the one soft
 * shape in an otherwise hard-edged mark, and the controls echo it.
 */
const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    'bg-brand-700 text-white shadow-[0_1px_2px_rgb(18_52_27/0.2),0_10px_24px_-12px_rgb(39_107_52/0.8)] hover:bg-brand-800 active:bg-brand-900',
  secondary:
    'bg-surface text-heading border border-border-strong hover:border-brand-400 hover:bg-surface-tint-soft',
  soft: 'bg-surface-tint text-brand-900 hover:bg-brand-200',
  ghost: 'bg-transparent text-text-brand hover:bg-surface-tint-soft',
  inverse: 'bg-white text-brand-900 shadow-[0_10px_24px_-12px_rgb(0_0_0/0.5)] hover:bg-brand-50',
  // For a dark or photographic background.
  'outline-inverse': 'bg-white/0 text-white border border-white/35 hover:bg-white/10',
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'min-h-10 px-4 py-2 text-caption',
  md: 'min-h-11 px-5 py-2.5 text-body',
  lg: 'min-h-13 px-7 py-3.5 text-body-lg',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold no-underline transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:scale-[0.98]'

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
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
