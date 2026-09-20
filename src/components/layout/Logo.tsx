import { useId } from 'react'

import { cn } from '@/lib/cn'
import {
  WORDMARK_DISC,
  WORDMARK_PATH,
  WORDMARK_TRIANGLE,
  WORDMARK_VIEWBOX,
} from './wordmark-geometry'

/**
 * THE KNOCKOUT RULE (brief section 11) — the one thing to get wrong.
 *
 * The play triangle is punched through the green disc, not painted white. On a
 * light background the page shows through it and it reads correctly. On a green
 * or dark background it vanishes, so the solid variant, with the triangle
 * actually painted white, must be used instead.
 *
 * That is why `onDark` is a decision at every call site rather than something
 * a component guesses. The mask id comes from `useId` so two marks on one page
 * (header and footer) never share a mask.
 */
function useMaskId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
}

export function PlayMark({
  onDark = false,
  size = 40,
  className,
  title,
}: {
  onDark?: boolean
  size?: number
  className?: string
  title?: string
}) {
  const id = useMaskId('hgp-play')

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {onDark ? (
        <>
          <circle cx="256" cy="256" r="256" fill="var(--brand-600)" />
          <polygon
            points="178,144 381,256 178,368"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="30.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <defs>
            <mask id={id}>
              <rect width="512" height="512" fill="#fff" />
              <polygon
                points="178,144 381,256 178,368"
                fill="none"
                stroke="#000"
                strokeWidth="30.4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </mask>
          </defs>
          <circle cx="256" cy="256" r="256" fill="var(--brand-600)" mask={`url(#${id})`} />
        </>
      )}
    </svg>
  )
}

/**
 * The HiGP wordmark, as vector. The letterforms are `currentColor` so the
 * parent decides: ink on a light surface, white on a dark one — and in dark
 * mode the ink token is already light, so nothing here branches on theme.
 *
 * Inlined rather than loaded as an <img>: it is on every page, it is 4 KB, and
 * inlining removes a request from the critical path on a slow connection.
 */
export function Wordmark({
  onDark = false,
  height = 44,
  className,
  title,
}: {
  onDark?: boolean
  height?: number
  className?: string
  title?: string
}) {
  const id = useMaskId('hgp-wm')
  const { width: vw, height: vh } = WORDMARK_VIEWBOX
  const { cx, cy, r } = WORDMARK_DISC
  const width = Math.round((height * vw) / vh)

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width={width}
      height={height}
      className={cn('shrink-0', onDark ? 'text-white' : 'text-ink', className)}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {onDark ? null : (
        <defs>
          <mask id={id}>
            <rect width={vw} height={vh} fill="#fff" />
            <polygon
              points={WORDMARK_TRIANGLE.points}
              fill="none"
              stroke="#000"
              strokeWidth={WORDMARK_TRIANGLE.strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </mask>
        </defs>
      )}
      <path d={WORDMARK_PATH} fill="currentColor" />
      {onDark ? (
        <>
          <circle cx={cx} cy={cy} r={r} fill="var(--brand-600)" />
          <polygon
            points={WORDMARK_TRIANGLE.points}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={WORDMARK_TRIANGLE.strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      ) : (
        <circle cx={cx} cy={cy} r={r} fill="var(--brand-600)" mask={`url(#${id})`} />
      )}
    </svg>
  )
}

/** The wordmark with an accessible name. `label` is the site name in the current language. */
export function Logo({
  onDark = false,
  className,
  label,
  height = 44,
}: {
  onDark?: boolean
  className?: string
  label: string
  height?: number
}) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <Wordmark onDark={onDark} height={height} />
      <span className="sr-only">{label}</span>
    </span>
  )
}
