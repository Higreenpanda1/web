'use client'

import { useEffect } from 'react'

/**
 * Mount once per page. Marks <html> so the CSS in globals.css knows a
 * JavaScript observer is present (before that, nothing is hidden), then sets
 * `data-revealed` on every `[data-reveal]` element as it enters the viewport.
 * Elements inside the same parent stagger by 70ms via `--reveal-delay`.
 *
 * The marker is an attribute React never renders, not a class: a client
 * component that re-renders with a different `className` (the journey list
 * does, on every scroll, as the active step changes) would otherwise
 * overwrite a class added here, and the element — already unobserved —
 * would fade out for good. Once revealed, an element stays revealed.
 *
 * Deliberately not a wrapper component: server components keep their markup
 * and just add an attribute, and there is exactly one observer per page.
 */
export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) return

    root.classList.add('js-reveal')
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))

    // Stagger siblings that reveal together.
    const seen = new Map<Element, number>()
    for (const el of items) {
      const parent = el.parentElement ?? document.body
      const index = seen.get(parent) ?? 0
      seen.set(parent, index + 1)
      el.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 70}ms`)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true')
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )
    for (const el of items) {
      // Already on screen (above the fold): show at once, no pop-in.
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.9) el.setAttribute('data-revealed', 'true')
      else observer.observe(el)
    }
    return () => {
      observer.disconnect()
      root.classList.remove('js-reveal')
    }
  }, [])

  return null
}
