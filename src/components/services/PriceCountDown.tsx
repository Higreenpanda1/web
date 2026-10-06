'use client'

import { useEffect, useRef, useState } from 'react'

import { formatNumber } from '@/i18n/format'

import type { Locale } from '@/i18n/routing'

/**
 * "¥15,000" counting down to the real starting price the first time it
 * scrolls into view — the owner's request, so the real figure lands after a
 * larger one. The server renders the real price, so without JS, under
 * prefers-reduced-motion, or for screen readers, only the real price exists.
 */
export function PriceCountDown({
  amount,
  from,
  locale,
}: {
  amount: number
  from: number
  locale: Locale
}) {
  const [shown, setShown] = useState<number | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  const animate = from > amount

  useEffect(() => {
    const el = ref.current
    if (!el || !animate) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        // The large figure appears only once the count has started, and the
        // last frame hands back to the real price, so it can never stick.
        setShown(from)
        const start = performance.now()
        const duration = 900
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          if (p < 1) {
            setShown(Math.round(from - (from - amount) * eased))
            frame = requestAnimationFrame(tick)
          } else {
            setShown(null)
          }
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      setShown(null)
    }
  }, [amount, from, animate])

  const real = `¥${formatNumber(Math.round(amount), locale)}`
  const display = `¥${formatNumber(shown ?? Math.round(amount), locale)}`
  return (
    <span ref={ref}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{real}</span>
    </span>
  )
}
