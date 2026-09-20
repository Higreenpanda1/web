import { cn } from '@/lib/cn'

/**
 * THE KNOCKOUT RULE (brief section 11) — the one thing to get wrong.
 *
 * The play triangle is punched through the green disc, not painted white. On a
 * light background the page shows through it and it reads correctly. On a green
 * or dark background it vanishes, so the solid variant, with the triangle
 * actually painted white, must be used instead.
 *
 * That is why `onDark` is a required decision at every call site rather than
 * something a component guesses. The two files are:
 *   knockout → /brand/vector/icon-play.svg       (light backgrounds)
 *   solid    → /brand/vector/icon-play-white.svg (green, photography, dark UI)
 *
 * The mark is inlined rather than loaded as an <img> because it appears in the
 * header on every page: inlining costs about 400 bytes and removes a request
 * from the critical path on a slow connection.
 */
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
  const id = onDark ? undefined : 'hgp-play-knockout'

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
 * Wordmark plus mark. The wordmark exists only as pixels — brief section 11
 * flags getting the vector original from the designer as an open item — so the
 * lockup here is the vector mark beside live text rather than the raster
 * wordmark, which keeps the header sharp at any zoom and saves ~15 KB.
 * Swap in the vector wordmark when it arrives.
 */
export function Logo({
  onDark = false,
  className,
  label,
}: {
  onDark?: boolean
  className?: string
  label: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <PlayMark onDark={onDark} size={36} />
      <span
        className={cn(
          'text-h3 font-bold tracking-tight whitespace-nowrap',
          onDark ? 'text-white' : 'text-[var(--ink)]',
        )}
      >
        {label}
      </span>
    </span>
  )
}
