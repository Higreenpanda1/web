'use client'

import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

type NavItem = { label: string; href: string }

/**
 * The mobile menu: a full-height sheet under the header. Closes on route
 * change and on Escape, locks page scroll while open, moves focus to the first
 * link when it opens and back to the trigger when it closes.
 *
 * The language switcher is passed in as `children` so the same component
 * serves both the desktop header and this sheet.
 *
 * The sheet is portalled to <body>: the header's backdrop-blur makes it the
 * containing block for fixed descendants, which would otherwise squash the
 * sheet to the header's own height and leave it invisible.
 */
export function MobileNav({
  items,
  openLabel,
  closeLabel,
  navLabel,
  ctaLabel,
  ctaHref,
  whatsappLabel,
  whatsappHref,
  children,
}: {
  items: NavItem[]
  openLabel: string
  closeLabel: string
  navLabel: string
  ctaLabel: string
  ctaHref: string
  whatsappLabel: string
  whatsappHref: string
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? closeLabel : openLabel}
        className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-text transition-colors hover:bg-surface-tint-soft"
      >
        {open ? (
          <X size={22} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>

      {mounted
        ? createPortal(
            <div
              id="mobile-nav-panel"
              ref={panelRef}
              hidden={!open}
              className={cn(
                'fixed inset-x-0 top-[var(--header-height)] bottom-0 z-40 overflow-y-auto bg-surface lg:hidden',
                open && 'animate-fade-in',
              )}
            >
              <nav aria-label={navLabel} className="container-page flex min-h-full flex-col py-4">
                <ul className="flex flex-col">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block border-b border-border-soft py-4 text-h3 font-bold text-heading no-underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    href={ctaHref}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-700 px-6 text-body-lg font-semibold text-white no-underline"
                  >
                    {ctaLabel}
                  </Link>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-analytics-event="whatsapp_click"
                    data-analytics-location="mobile_menu"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-brand-300 bg-surface-tint-soft px-6 text-body-lg font-semibold text-heading no-underline"
                  >
                    <WhatsAppIcon size={20} />
                    {whatsappLabel}
                  </a>
                </div>

                {children ? <div className="mt-auto pt-8">{children}</div> : null}
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
