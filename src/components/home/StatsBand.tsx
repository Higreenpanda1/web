import { CountUp } from '@/components/ui/CountUp'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { cn } from '@/lib/cn'

/**
 * The numbers, in a deep-green panel. Western Arabic numerals in both locales,
 * isolated so an RTL paragraph cannot reorder the digits.
 */
export function StatsBand({
  eyebrow,
  heading,
  items,
  className,
}: {
  eyebrow?: string | null
  heading?: string | null
  items: Array<{ value: string; label: string }>
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-xl bg-gradient-deep px-6 py-10 text-white md:px-12 md:py-14',
        className,
      )}
    >
      <div className="absolute inset-0 -z-10 bg-dots-inverse opacity-50" aria-hidden="true" />
      {heading ? (
        <div className="max-w-[var(--measure)]">
          {eyebrow ? (
            <Eyebrow inverse className="mb-3">
              {eyebrow}
            </Eyebrow>
          ) : null}
          <h2 className="text-white">{heading}</h2>
        </div>
      ) : null}
      <dl
        className={cn(
          'grid gap-8 sm:grid-cols-2 lg:grid-cols-4',
          heading ? 'mt-10 border-t border-white/10 pt-10' : '',
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="border-s-2 border-brand-500/60 ps-5">
            <dt className="ltr-nums text-display leading-none font-bold text-white">
              <CountUp value={item.value} />
            </dt>
            <dd className="mt-3 text-body-lg text-brand-200">{item.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
