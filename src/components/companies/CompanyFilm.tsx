'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'

const FRAME_MS = 5200

/**
 * The short "film" at the top of each company card on the homepage: four
 * stills with a slow Ken Burns drift, letterbox bars, grain, a light sweep,
 * a caption per shot and a progress meter. The owner asked for something
 * cinematic rather than line drawings (28 October 2026). Purely decorative,
 * so it is hidden from screen readers; the card's own text says the same.
 */
export function CompanyFilm({
  label,
  kicker,
  frames,
  delay = 0,
}: {
  label: string
  kicker: string
  frames: { src: string; caption: string }[]
  delay?: number
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (frames.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let interval: number | undefined
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => setIndex((i) => (i + 1) % frames.length), FRAME_MS)
    }, delay)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(interval)
    }
  }, [frames.length, delay])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div
      aria-hidden="true"
      className="co-film"
      style={{ '--film-frame': `${FRAME_MS}ms` } as React.CSSProperties}
    >
      {frames.map((frame, i) => (
        <div key={frame.src} className={cn('co-film-frame', i === index && 'is-on')}>
          <Image
            src={frame.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            priority={i === 0}
          />
        </div>
      ))}
      <div className="co-film-grade" />
      <div className="co-film-flare" />
      <div className="co-film-vignette" />
      <div className="co-film-grain" />
      <div className="co-film-tc">
        {label} · {pad(index + 1)} / {pad(frames.length)}
      </div>
      <div className="co-film-cap">
        <small>{kicker}</small>
        <div className="co-film-words">
          {frames.map((frame, i) => (
            <span key={frame.src} className={cn(i === index && 'is-on')}>
              {frame.caption}
            </span>
          ))}
        </div>
      </div>
      <div className="co-film-meter">
        {frames.map((frame, i) => (
          <i
            key={`${frame.src}-${i === index ? index : 'x'}`}
            className={cn(i < index && 'is-done', i === index && 'is-on')}
          >
            <b />
          </i>
        ))}
      </div>
    </div>
  )
}
