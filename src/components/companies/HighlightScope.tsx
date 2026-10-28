'use client'

import { useEffect, useRef } from 'react'

import type { ReactNode } from 'react'

/**
 * Draws the gold highlighter under every `.co-hl` inside it as it scrolls
 * into view, the way the course page does. With `loop` (the homepage only,
 * owner, 28 October 2026) the highlights wipe and redraw one after another
 * every seven seconds. Without JavaScript, or with reduced motion, they are
 * simply there.
 */
export function HighlightScope({
  children,
  loop = false,
  className,
}: {
  children: ReactNode
  loop?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    const marks = Array.from(root.querySelectorAll<HTMLElement>('.co-hl'))
    const timers: number[] = []
    for (const mark of marks) mark.classList.add('is-waiting')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const mark = entry.target as HTMLElement
          timers.push(window.setTimeout(() => mark.classList.remove('is-waiting'), 300))
          observer.unobserve(mark)
        }
      },
      { threshold: 0.6 },
    )
    for (const mark of marks) observer.observe(mark)

    let interval: number | undefined
    if (loop) {
      interval = window.setInterval(() => {
        if (document.hidden) return
        for (const mark of marks) mark.classList.add('is-waiting')
        marks.forEach((mark, index) => {
          timers.push(
            window.setTimeout(() => mark.classList.remove('is-waiting'), 900 + index * 220),
          )
        })
      }, 7000)
    }

    return () => {
      observer.disconnect()
      window.clearInterval(interval)
      for (const id of timers) window.clearTimeout(id)
    }
  }, [loop])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
