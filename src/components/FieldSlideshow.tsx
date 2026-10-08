'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

/** `caption` is shown over the photo while it is the current slide. */
export type Slide = { src: string; alt: string; caption?: string; note?: string }

const INTERVAL_MS = 3500

/**
 * A set of photos cross-fading on their own — on this site, one photo per
 * client or visit, each with its own one-line caption. It pauses while the
 * pointer is over it, while it is off screen, and entirely for anyone who has
 * asked for reduced motion — they get the cover photo and the dots to step
 * through by hand. Every photo is in the markup from the start, so the first
 * paint is the cover and nothing jumps when the next one fades in.
 */
export function FieldSlideshow({
  slides,
  label,
  className,
  sizes,
}: {
  slides: Slide[]
  /** Accessible name for the slideshow, e.g. the group's title. */
  label: string
  className?: string
  sizes: string
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reduce, setReduce] = useState(true)
  // A slide only becomes current once its photo has arrived, so a slow
  // connection never fades the cover out to an empty frame.
  const [loaded, setLoaded] = useState<boolean[]>(() => slides.map((_, i) => i === 0))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const node = ref.current
    // Photos that finished loading before hydration never fire onLoad.
    const images = Array.from(node?.querySelectorAll('img') ?? [])
    setLoaded((current) =>
      current.map((v, i) => v || Boolean(images[i]?.complete && images[i]?.naturalWidth)),
    )
    if (!node || !('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      {
        threshold: 0.3,
      },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (slides.length < 2 || paused || !visible || reduce) return
    const timer = window.setInterval(
      () =>
        setIndex((current) => {
          const next = (current + 1) % slides.length
          return loaded[next] ? next : current
        }),
      INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [slides.length, paused, visible, reduce, loaded])

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slideshow"
      aria-label={label}
      className={cn('relative overflow-hidden', className)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          sizes={sizes}
          // Only the cover loads up front; the rest load lazily behind it.
          loading={i === 0 ? undefined : 'lazy'}
          aria-hidden={i !== index}
          onLoad={() =>
            setLoaded((current) => (current[i] ? current : current.map((v, j) => v || j === i)))
          }
          className={cn(
            'object-cover transition-opacity duration-700 ease-out motion-reduce:transition-none',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-4 pt-16 pb-2 text-white">
        {slides[index]?.caption ? (
          <p aria-live="polite" className="m-0 text-body leading-snug font-semibold">
            {slides[index]?.caption}
            {slides[index]?.note ? (
              <span className="mt-0.5 block text-caption font-normal text-white/80">
                <bdi>{slides[index]?.note}</bdi>
              </span>
            ) : null}
          </p>
        ) : null}
        {slides.length > 1 ? (
          <div className="mt-1 flex flex-wrap justify-center">
            {slides.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                aria-label={`${i + 1} / ${slides.length}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => loaded[i] && setIndex(i)}
                className="group/dot flex h-6 items-center px-1"
              >
                <span
                  className={cn(
                    'block h-1.5 rounded-full transition-all duration-300',
                    i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60 group-hover/dot:bg-white/90',
                  )}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
