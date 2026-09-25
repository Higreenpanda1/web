'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { CONSENT_CHANGE_EVENT, readConsent, writeConsent } from '@/lib/analytics-events'

/**
 * The consent banner, shown once until the visitor answers. Two choices of
 * equal weight — no dark pattern where "decline" is a text link and "accept"
 * a big green button — and no tracking cookie is set by either until the
 * answer is "accept" (see GoogleAnalytics.tsx for how).
 *
 * Small on purpose: two lines of text and two buttons, a card at the bottom
 * corner on a desktop, a bar across the bottom on a phone. On a phone it
 * would sit exactly where the WhatsApp button lives — the most important
 * control on the site — so while it is visible it publishes its height as
 * `--consent-offset` and the button moves up out of the way.
 *
 * It renders nothing at all until it has read storage on the client, so the
 * server HTML never flashes a banner at a visitor who already answered.
 */
export function ConsentBanner({
  title,
  body,
  acceptLabel,
  declineLabel,
  privacyLabel,
  regionLabel,
}: {
  title: string
  body: string
  acceptLabel: string
  declineLabel: string
  privacyLabel: string
  regionLabel: string
}) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sync = () => setOpen(readConsent() === null)
    sync()
    window.addEventListener(CONSENT_CHANGE_EVENT, sync)
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, sync)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (!open || !panelRef.current) {
      root.style.removeProperty('--consent-offset')
      return
    }
    const compact = window.matchMedia('(max-width: 639px)')
    const publish = () => {
      const height = compact.matches && panelRef.current ? panelRef.current.offsetHeight : 0
      root.style.setProperty('--consent-offset', `${height}px`)
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(panelRef.current)
    compact.addEventListener('change', publish)
    return () => {
      observer.disconnect()
      compact.removeEventListener('change', publish)
      root.style.removeProperty('--consent-offset')
    }
  }, [open])

  if (!open) return null

  const choose = (choice: 'granted' | 'denied') => {
    writeConsent(choice)
    setOpen(false)
  }

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label={regionLabel}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4 shadow-float sm:inset-x-auto sm:start-5 sm:bottom-5 sm:max-w-sm sm:rounded-[var(--radius-lg)] sm:border sm:p-5"
    >
      <p className="text-body font-semibold text-heading">{title}</p>
      <p className="mt-1 text-caption text-text-muted">
        {body}{' '}
        <Link href="/privacy" className="font-semibold text-text-brand">
          {privacyLabel}
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" className="flex-1" onClick={() => choose('granted')}>
          {acceptLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={() => choose('denied')}
        >
          {declineLabel}
        </Button>
      </div>
    </div>
  )
}
