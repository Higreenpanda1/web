'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

type Phase = 'idle' | 'play' | 'merge' | 'out'

/**
 * The homepage title, as the owner asked for it (28 October 2026): it writes
 * itself in, a gold rule draws underneath, then ", two specialist companies"
 * dissolves into "One brand" and a gold 1 appears. The whole thing plays
 * again every eleven seconds. Screen readers get the full sentence once;
 * with reduced motion it simply shows the merged state.
 */
export function BrandTitle({
  main,
  tail,
  full,
  loop = true,
}: {
  main: string
  tail: string
  full: string
  loop?: boolean
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [run, setRun] = useState(0)
  const [still, setStill] = useState(false)
  const tailRef = useRef<HTMLSpanElement>(null)
  const [tailWidth, setTailWidth] = useState<number | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [minHeight, setMinHeight] = useState<number | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true)
      setPhase('merge')
      return
    }
    if (tailRef.current) setTailWidth(tailRef.current.scrollWidth + 40)
    const timers: number[] = []
    // A fresh `run` remounts the inked text, which restarts its CSS animation.
    setRun((r) => r + 1)
    setPhase('play')
    timers.push(window.setTimeout(() => setPhase('merge'), 4600))
    if (loop) {
      timers.push(window.setTimeout(() => setPhase('out'), 10200))
      const cycle = window.setInterval(() => {
        setRun((r) => r + 1)
        setPhase('play')
        timers.push(window.setTimeout(() => setPhase('merge'), 4600))
        timers.push(window.setTimeout(() => setPhase('out'), 10200))
      }, 11000)
      timers.push(cycle)
    }
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [loop])

  // Keep the full title's height while it is folded, so on a phone, where
  // it takes more lines, the page below does not jump on every loop.
  useEffect(() => {
    if (phase !== 'play' || !titleRef.current) return
    setMinHeight(null)
    const frame = window.requestAnimationFrame(() => {
      if (titleRef.current) setMinHeight(titleRef.current.offsetHeight)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [phase, run])

  const merged = phase === 'merge' || phase === 'out'
  // The comma stays on the first line with "One brand" when the title wraps
  // on a phone, and fades with the rest of the tail.
  const punct = /^[،,，]/.test(tail) ? tail[0] : ''
  const rest = punct ? tail.slice(1).trimStart() : tail

  return (
    <>
      <h1
        ref={titleRef}
        className={cn('brand-title', phase === 'out' && 'is-out', merged && 'is-merged')}
        style={minHeight ? { minHeight: `${minHeight}px` } : undefined}
      >
        <span className="sr-only">{full}</span>
        <span
          key={run}
          aria-hidden="true"
          className={cn('brand-title-ink', phase !== 'idle' && !still && 'is-playing')}
        >
          <span className="brand-title-main">
            {main}
            {punct ? <span className="brand-title-punct">{punct}</span> : null}
          </span>
          <span
            ref={tailRef}
            className="brand-title-tail"
            style={tailWidth ? { maxWidth: `${tailWidth}px` } : undefined}
          >
            {rest}
          </span>
        </span>
        <span aria-hidden="true" className="brand-title-one">
          1
        </span>
      </h1>
      <div
        key={`rule-${run}`}
        aria-hidden="true"
        className={cn(
          'brand-rule',
          (phase !== 'idle' || still) && 'is-playing',
          phase === 'out' && 'is-out',
          still && 'is-still',
        )}
      />
    </>
  )
}
