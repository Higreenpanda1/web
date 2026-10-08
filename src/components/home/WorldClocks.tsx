'use client'

import { useEffect, useState } from 'react'

import { Container } from '@/components/ui/Container'
import { cn } from '@/lib/cn'

/**
 * Three analogue clocks under the hero: our Shenzhen office first, then the
 * two places most clients write from. The office badge follows China time,
 * Monday to Friday, 09:00 to 18:00 (the owner's hours, 8 October 2026).
 *
 * The server cannot know the visitor's "now", so the hands, the time line
 * and the badge appear only after the first client tick; the dials render
 * straight away so nothing shifts.
 */
const OFFICE_TZ = 'Asia/Shanghai'
const OFFICE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const OFFICE_OPEN_HOUR = 9
const OFFICE_CLOSE_HOUR = 18

type Labels = {
  heading: string
  open: string
  closed: string
  cities: { name: string; timeZone: string; office?: boolean }[]
}

function partsIn(timeZone: string, now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  return {
    weekday: get('weekday'),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
  }
}

function officeIsOpen(now: Date) {
  const { weekday, hour } = partsIn(OFFICE_TZ, now)
  return OFFICE_DAYS.includes(weekday) && hour >= OFFICE_OPEN_HOUR && hour < OFFICE_CLOSE_HOUR
}

const TICKS = Array.from({ length: 60 }, (_, i) => i)

function Dial({ now, timeZone, label }: { now: Date | null; timeZone: string; label: string }) {
  const p = now ? partsIn(timeZone, now) : null
  const hand = (deg: number) => ({ transform: `rotate(${deg}deg)`, transformOrigin: '60px 60px' })

  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className="size-24 sm:size-28">
      <circle cx="60" cy="60" r="56" className="fill-surface stroke-border" strokeWidth="2" />
      {TICKS.map((i) => {
        const major = i % 5 === 0
        return (
          <line
            key={i}
            x1="60"
            y1={major ? 9 : 10}
            x2="60"
            y2={major ? 17 : 13}
            strokeLinecap="round"
            strokeWidth={major ? 2 : 1.5}
            className={major ? 'stroke-text-muted' : 'stroke-border'}
            style={hand(i * 6)}
          />
        )
      })}
      {p ? (
        <>
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="32"
            strokeWidth="5"
            strokeLinecap="round"
            className="stroke-heading"
            style={hand((p.hour % 12) * 30 + p.minute * 0.5)}
          />
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="20"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="stroke-heading"
            style={hand(p.minute * 6 + p.second * 0.1)}
          />
          <line
            x1="60"
            y1="68"
            x2="60"
            y2="16"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="stroke-brand-600"
            style={hand(p.second * 6)}
          />
        </>
      ) : null}
      <circle cx="60" cy="60" r="3.5" className="fill-brand-600" />
    </svg>
  )
}

export function WorldClocks({ locale, labels }: { locale: string; labels: Labels }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const numberLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB'
  const open = now ? officeIsOpen(now) : null

  return (
    <section aria-label={labels.heading} className="bg-surface pb-10 md:pb-14">
      <Container>
        <ul className="grid grid-cols-3 gap-3 sm:gap-4">
          {labels.cities.map((city) => (
            <li
              key={city.timeZone}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border px-2 py-4 text-center sm:px-4',
                city.office ? 'border-brand-200 bg-surface-tint' : 'border-border-soft bg-surface',
              )}
            >
              <Dial now={now} timeZone={city.timeZone} label={city.name} />
              <span className="mt-2 text-caption font-semibold text-heading">{city.name}</span>
              <span className="ltr-nums min-h-[1.5em] text-caption text-text-muted">
                {now
                  ? `${new Intl.DateTimeFormat(numberLocale, { timeZone: city.timeZone, weekday: 'long' }).format(now)} · ${new Intl.DateTimeFormat('en-GB', { timeZone: city.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)}`
                  : null}
              </span>
              {city.office && open !== null ? (
                <span
                  className={cn(
                    'mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-eyebrow font-semibold',
                    open ? 'bg-brand-100 text-text-brand' : 'bg-accent/15 text-accent-text',
                  )}
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  {open ? labels.open : labels.closed}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
