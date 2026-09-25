'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { CONSENT_CHANGE_EVENT, clearConsent, readConsent } from '@/lib/analytics-events'

/**
 * On the privacy page: what the visitor chose, and a way to change it. Clearing
 * the stored answer brings the banner back on this same page, and Consent Mode
 * is set to denied at once, so "change my mind" never means "wait for the next
 * visit". Renders nothing when analytics is not on the page.
 */
export function ConsentSettings({
  labelGranted,
  labelDenied,
  changeLabel,
}: {
  labelGranted: string
  labelDenied: string
  changeLabel: string
}) {
  const [choice, setChoice] = useState<'granted' | 'denied' | null>(null)

  useEffect(() => {
    const sync = () => setChoice(readConsent())
    sync()
    window.addEventListener(CONSENT_CHANGE_EVENT, sync)
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, sync)
  }, [])

  if (!choice) return null

  return (
    <p className="flex flex-wrap items-center gap-3">
      <span>{choice === 'granted' ? labelGranted : labelDenied}</span>
      <Button type="button" size="sm" variant="secondary" onClick={() => clearConsent()}>
        {changeLabel}
      </Button>
    </p>
  )
}
