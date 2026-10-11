'use client'

import { Play } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

import type { YoutubeVideo } from '@/lib/youtube'

const INTERVAL_MS = 4000

/**
 * The channel's latest videos, one large at a time, moving on by itself every
 * four seconds (the owner's choice). The rest sit in a list beside it on wide
 * screens so the visitor can see what is coming and jump straight to one.
 * Like FieldSlideshow it pauses under the pointer or keyboard focus, while
 * off screen, and entirely for anyone who has asked for reduced motion.
 *
 * Nothing is embedded: each video opens on YouTube in a new tab, so the page
 * loads no YouTube script and the security policy stays as it is.
 */
export function VideoCarousel({ videos, label }: { videos: YoutubeVideo[]; label: string }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reduce, setReduce] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const node = ref.current
    if (!node || !('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { threshold: 0.3 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (videos.length < 2 || paused || !visible || reduce) return
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % videos.length),
      INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [videos.length, paused, visible, reduce, index])

  const current = videos[index]
  if (!current) return null

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-8"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div>
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block aspect-video overflow-hidden rounded-2xl bg-brand-900 shadow-card"
        >
          {videos.map((video, i) => (
            <Image
              key={video.id}
              src={video.thumbnail}
              alt=""
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              loading={i === 0 ? undefined : 'lazy'}
              className={cn(
                'object-cover transition-opacity duration-700 ease-out motion-reduce:transition-none',
                i === index ? 'opacity-100' : 'opacity-0',
              )}
            />
          ))}
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-white/95 text-brand-700 shadow-lg transition-transform duration-200 group-hover:scale-110 sm:size-16 md:size-20">
              <Play size={24} fill="currentColor" aria-hidden="true" className="ms-1" />
            </span>
          </span>
          <span
            aria-live="polite"
            className="absolute inset-x-0 bottom-0 line-clamp-2 p-3 text-body leading-snug font-semibold text-white sm:p-4 md:p-6 md:text-body-lg"
          >
            <bdi>{current.title}</bdi>
          </span>
        </a>

        {videos.length > 1 ? (
          <div className="mt-3 flex justify-center lg:hidden">
            {videos.map((video, i) => (
              <button
                key={video.id}
                type="button"
                aria-label={`${i + 1} / ${videos.length}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => setIndex(i)}
                className="group/dot flex h-8 items-center px-1.5"
              >
                <span
                  className={cn(
                    'block h-2 rounded-full transition-all duration-300',
                    i === index
                      ? 'w-6 bg-brand-700'
                      : 'w-2 bg-brand-200 group-hover/dot:bg-brand-400',
                  )}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <ol className="hidden list-none flex-col gap-3 p-0 lg:flex">
        {videos.map((video, i) => (
          <li key={video.id}>
            <button
              type="button"
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                'grid w-full grid-cols-[7.5rem_1fr] items-center gap-3 rounded-xl border p-2 text-start transition-colors duration-200',
                i === index
                  ? 'border-brand-400 bg-surface-tint-soft'
                  : 'border-border-soft bg-surface hover:border-brand-200',
              )}
            >
              <span className="relative block aspect-video overflow-hidden rounded-lg bg-brand-900">
                <Image
                  src={video.thumbnail}
                  alt=""
                  fill
                  sizes="120px"
                  loading="lazy"
                  className="object-cover"
                />
              </span>
              <span className="line-clamp-2 text-caption leading-snug font-semibold text-heading">
                <bdi>{video.title}</bdi>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
