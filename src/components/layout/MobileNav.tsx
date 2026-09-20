'use client'

import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Link, usePathname } from '@/i18n/navigation'

type NavItem = { label: string; href: string }

/**
 * The mobile menu. Closes on route change and on Escape, traps nothing (it is a
 * disclosure, not a modal) but does move focus to the first link when it opens
 * and back to the trigger when it closes, which is what a keyboard or screen
 * reader user needs from a disclosure of this size.
 */
export function MobileNav({
  items,
  openLabel,
  closeLabel,
  navLabel,
}: {
  items: NavItem[]
  openLabel: string
  closeLabel: string
  navLabel: string
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? closeLabel : openLabel}
        className="inline-flex size-11 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--text)]"
      >
        {open ? (
          <X size={22} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Menu size={22} strokeWidth={1.5} aria-hidden="true" />
        )}
      </button>

      <div
        id="mobile-nav-panel"
        ref={panelRef}
        hidden={!open}
        className="absolute start-0 end-0 top-full border-b border-[var(--border)] bg-[var(--surface)] shadow-lg"
      >
        <nav aria-label={navLabel} className="container-page py-3">
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block border-b border-[var(--border)] py-3.5 text-body-lg font-semibold text-[var(--text)] no-underline last:border-b-0"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
