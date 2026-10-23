import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'outline-inverse' | 'soft'
type Size = 'sm' | 'md' | 'lg'

/**
 * Since 23 October 2026 the buttons follow the course page: the primary is
 * its gold with deep green text (well above AA), and corners are near-square,
 * as on that page.
 */
const VARIANT_CLASS: Record<Variant, string> = {
  // The course page's gold, on light and dark grounds alike.
  primary:
    'bg-[linear-gradient(135deg,#f0c56a,#e0a32e_55%,#b9821f)] text-[#10220f] shadow-[0_10px_30px_-12px_rgb(224_163_46/0.7)] hover:shadow-[0_16px_40px_-14px_rgb(224_163_46/0.85)] hover:-translate-y-0.5',
  secondary:
    'bg-transparent text-heading border border-border-strong hover:border-accent hover:text-text-brand',
  soft: 'bg-surface-tint text-heading hover:bg-brand-200 hover:text-brand-900',
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
  'inline-flex items-center justify-center gap-2 rounded-[3px] font-semibold no-underline transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:scale-[0.98]'

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
