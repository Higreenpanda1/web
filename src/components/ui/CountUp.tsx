'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * "235+" counts up from zero the first time it scrolls into view. The
 * numeric part is parsed out of the label so the suffix ("+", "K+") stays
 * put; under prefers-reduced-motion, or without a number, it just renders.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const match = /^(\d[\d,]*)(.*)$/.exec(value)
  const target = match ? Number((match[1] ?? '').replace(/,/g, '')) : NaN
  const suffix = match?.[2] ?? ''
  const [shown, setShown] = useState<number | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !Number.isFinite(target)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        const start = performance.now()
        const duration = 1400
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setShown(Math.round(target * eased))
          if (p < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [target])

  if (!Number.isFinite(target)) return <span className={className}>{value}</span>
  const display = shown === null ? target : shown
  return (
    <span ref={ref} className={className}>
      {display.toLocaleString('en-US')}
      {suffix}
    </span>
  )
}
