'use client'

import { useEffect } from 'react'

import { trackEvent, type AnalyticsEventName } from '@/lib/analytics-events'

/**
 * One delegated click listener for every link marked
 * `data-analytics-event="…"` (with an optional `data-analytics-location`).
 *
 * Delegation keeps the WhatsApp buttons what they are — plain anchors that
 * work before hydration and with JavaScript off — instead of turning nine of
 * them into client components for the sake of one `onClick`.
 */
export function ClickTracking() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const element = target?.closest<HTMLElement>('[data-analytics-event]')
      if (!element) return
      const name = element.dataset.analyticsEvent as AnalyticsEventName
      const location = element.dataset.analyticsLocation
      trackEvent(name, location ? { location } : {})
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return null
}
