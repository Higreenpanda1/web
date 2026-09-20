import { ClipboardCheck, MessageSquareText, Search, Ship, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/cn'

const ICONS: LucideIcon[] = [MessageSquareText, Search, ClipboardCheck, Ship]

/**
 * The import process as a numbered flow — brief section 15 calls for exactly
 * this rather than generic corporate illustration. An <ol>, so a screen
 * reader announces the count and position; the dashed connector between
 * steps is drawn with logical insets so it runs the right way in Arabic.
 */
export function ProcessSteps({
  steps,
  className,
}: {
  steps: Array<{ title: string; body: string }>
  className?: string
}) {
  if (steps.length === 0) return null
  const columns = Math.min(steps.length, 4)

  return (
    <ol
      className={cn(
        'grid list-none gap-10 p-0 md:grid-cols-2',
        columns === 4 && 'lg:grid-cols-4',
        columns === 3 && 'lg:grid-cols-3',
        className,
      )}
    >
      {steps.map((step, index) => {
        const Icon: LucideIcon = ICONS[index % ICONS.length] ?? MessageSquareText
        const last = index === steps.length - 1
        return (
          <li key={`${index}-${step.title}`} className="relative">
            {!last ? (
              <span
                aria-hidden="true"
                className="absolute top-7 -end-10 start-[4.5rem] hidden border-t-2 border-dashed border-brand-200 lg:block"
              />
            ) : null}
            <div className="flex items-center gap-3">
              <span className="relative z-10 inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white shadow-glow">
                <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="ltr-nums text-eyebrow font-bold tracking-[0.14em] text-text-brand">
                0{index + 1}
              </span>
            </div>
            <h3 className="mt-5">{step.title}</h3>
            <p className="mt-2 text-text-muted">{step.body}</p>
          </li>
        )
      })}
    </ol>
  )
}
