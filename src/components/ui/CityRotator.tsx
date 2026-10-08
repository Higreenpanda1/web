'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'

/**
 * The hero's city chip: one city at a time, swapping every 2.5 seconds with
 * a soft fade. Every label sits in the same grid cell so the chip is as wide
 * as the longest one and never jumps. Screen readers get the full list once;
 * under prefers-reduced-motion it stays on the full list too.
 */
export function CityRotator({
  cities,
  fullList,
  interval = 2500,
}: {
  cities: string[]
  fullList: string
  interval?: number
}) {
  const [index, setIndex] = useState(0)
  const [still, setStill] = useState(false)

  useEffect(() => {
    if (cities.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true)
      return
    }
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % cities.length), interval)
    return () => window.clearInterval(timer)
  }, [cities.length, interval])

  if (still || cities.length < 2) return <span>{fullList}</span>

  return (
    <>
      <span className="sr-only">{fullList}</span>
      <span aria-hidden="true" className="inline-grid">
        {cities.map((city, i) => (
          <span
            key={city}
            className={cn(
              'col-start-1 row-start-1 transition-all duration-500 ease-out',
              i === index ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
            )}
          >
            {city}
          </span>
        ))}
      </span>
    </>
  )
}
