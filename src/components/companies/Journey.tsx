'use client'

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  FilePen,
  HeartHandshake,
  Landmark,
  Lightbulb,
  Mail,
  MapPin,
  Search,
  Smartphone,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

import type { Locale } from '@/i18n/routing'

export const JOURNEY_ICONS = {
  idea: Lightbulb,
  research: Search,
  trademark: BadgeCheck,
  company: Building2,
  hongKong: Landmark,
  address: MapPin,
  bank: Wallet,
  payments: Smartphone,
  residence: Users,
  invitation: Mail,
  family: HeartHandshake,
  accounting: Calculator,
  licence: FilePen,
  store: Store,
} satisfies Record<string, LucideIcon>

export type JourneyStep = {
  icon: keyof typeof JOURNEY_ICONS
  title: string
  body: string
  href: string
  linkLabel: string
  /** The application form for this step, when it has one. */
  apply?: { href: string; label: string }
}

/**
 * The journey, drawn as a road (restored on /higp, 28 October 2026, at the
 * owner's request, with HIGP's own steps only):
 * a dashed spine down the middle on wide screens (steps alternate sides),
 * a single column on phones. One step is open at a time; opening it shows
 * the detail and a link to the service that does that step.
 *
 * It replaces the four-step "how it works" strip and the nine-card grid: the
 * owner's own structure document (23 September 2026) describes exactly this,
 * and it explains the business in one scroll where the grid only listed it.
 */
export function Journey({
  steps,
  locale,
  stepLabel,
  className,
}: {
  steps: JourneyStep[]
  locale: Locale
  stepLabel: string
  className?: string
}) {
  const [open, setOpen] = useState(0)
  const [reached, setReached] = useState(1)
  const spineRef = useRef<SVGLineElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)
  const sectionRef = useRef<HTMLOListElement>(null)
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  // Draw the spine as the list scrolls through the viewport.
  useEffect(() => {
    const line = spineRef.current
    const list = sectionRef.current
    if (!line || !list) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      line.style.strokeDashoffset = '0'
      setReached(Number.MAX_SAFE_INTEGER)
      return
    }
    const length = 2000
    line.style.strokeDasharray = `${length}`
    const onScroll = () => {
      const rect = list.getBoundingClientRect()
      // The thread runs to the same line (60% down the screen) that lights the cards.
      const total = rect.height
      const passed = Math.min(Math.max(window.innerHeight * 0.6 - rect.top, 0), total)
      line.style.strokeDashoffset = `${length * (1 - passed / total)}`
      // The soft light at the tip of the thread travels with it.
      if (tipRef.current) tipRef.current.style.top = `${(passed / total) * 100}%`
    }
    // Every card rests dim; a card lights once the thread reaches it (its top
    // passes the middle of the screen) and stays lit to the end of the road.
    const items = Array.from(list.querySelectorAll<HTMLElement>('.journey-step'))
    const pick = () => {
      const mid = window.innerHeight * 0.6
      const count = items.filter((item) => item.getBoundingClientRect().top < mid).length
      setReached(Math.max(1, count))
    }
    const onScrollAll = () => {
      onScroll()
      pick()
    }
    onScrollAll()
    window.addEventListener('scroll', onScrollAll, { passive: true })
    window.addEventListener('resize', onScrollAll)
    return () => {
      window.removeEventListener('scroll', onScrollAll)
      window.removeEventListener('resize', onScrollAll)
    }
  }, [])

  return (
    <div className={cn('relative', className)}>
      {/* The spine. Positioned along the start edge on phones, centred on lg. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-[1.375rem] h-full w-px lg:start-1/2 lg:-translate-x-1/2"
        width="1"
        height="100%"
        preserveAspectRatio="none"
      >
        <line x1="0.5" y1="0" x2="0.5" y2="100%" className="stroke-border-soft" strokeWidth="1" />
        <line
          ref={spineRef}
          x1="0.5"
          y1="0"
          x2="0.5"
          y2="100%"
          className="journey-line stroke-brand-400"
          strokeWidth="1"
          pathLength={2000}
        />
      </svg>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-[1.375rem] z-20 w-px lg:start-1/2 lg:-translate-x-1/2"
      >
        <span ref={tipRef} className="journey-tip" />
      </span>

      <ol ref={sectionRef} className="relative m-0 list-none space-y-4 p-0 lg:space-y-6">
        {steps.map((step, index) => {
          const Icon = JOURNEY_ICONS[step.icon]
          const isOpen = open === index
          const left = index % 2 === 0
          const number = String(index + 1).padStart(2, '0')
          return (
            <li
              key={step.href + index}
              className={cn(
                'journey-step relative ps-14 lg:grid lg:grid-cols-[1fr_3.5rem_1fr] lg:items-start lg:gap-0 lg:ps-0',
                (index < reached || isOpen) && 'is-lit',
              )}
            >
              {/* Node on the spine */}
              <span
                aria-hidden="true"
                className={cn(
                  'journey-node absolute top-3 start-0 z-10 inline-flex size-11 items-center justify-center rounded-full border-2 lg:static lg:col-start-2 lg:mx-auto lg:size-14',
                  isOpen || index < reached
                    ? 'border-brand-500 bg-brand-600 text-white'
                    : 'border-border bg-surface text-text-muted',
                )}
              >
                <Icon size={isOpen ? 22 : 20} strokeWidth={1.75} />
              </span>

              <div
                className={cn(
                  'lg:row-start-1',
                  left ? 'lg:col-start-1 lg:pe-10' : 'lg:col-start-3 lg:ps-10',
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`journey-panel-${index}`}
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  className={cn(
                    'group w-full rounded-lg border bg-surface p-5 text-start transition-[border-color,box-shadow,transform] duration-300',
                    isOpen
                      ? 'border-brand-300 shadow-card'
                      : index < reached
                        ? 'border-brand-200 bg-brand-50'
                        : 'border-border-soft hover:border-brand-300 hover:shadow-card',
                  )}
                >
                  <span className="ltr-nums text-eyebrow font-bold ltr:tracking-[0.14em] text-text-brand uppercase">
                    {stepLabel} {number}
                  </span>
                  <span className="mt-1.5 block text-h3 font-bold text-heading">{step.title}</span>
                </button>

                <div
                  id={`journey-panel-${index}`}
                  data-open={isOpen}
                  aria-hidden={!isOpen}
                  className="journey-panel"
                >
                  <div>
                    <div className="rounded-b-lg border border-t-0 border-brand-300 bg-surface-tint-soft px-5 pt-3 pb-5">
                      <p className="text-text-muted">{step.body}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <Link
                          href={step.href}
                          tabIndex={isOpen ? 0 : -1}
                          className="inline-flex items-center gap-1.5 font-semibold text-text-brand no-underline"
                        >
                          {step.linkLabel}
                          <Arrow size={16} strokeWidth={2} aria-hidden="true" />
                        </Link>
                        {step.apply ? (
                          <Link
                            href={step.apply.href}
                            tabIndex={isOpen ? 0 : -1}
                            className="inline-flex items-center rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white no-underline hover:bg-brand-800"
                          >
                            {step.apply.label}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
