import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/cn'

/**
 * Native <details>: keyboard accessible, announced correctly, and works before
 * hydration — which on a slow 4G connection is most of the time a visitor
 * spends on the page. The chevron turns via the `.accordion[open]` rule.
 */
export function Accordion({
  items,
  className,
}: {
  items: Array<{ question: string; answer: string }>
  className?: string
}) {
  return (
    <div
      className={cn(
        'divide-y divide-border-soft rounded-lg border border-border-soft bg-surface',
        className,
      )}
    >
      {items.map((item, index) => (
        <details key={index} className="accordion group px-5">
          <summary className="flex min-h-14 items-center justify-between gap-4 py-4 text-body-lg font-semibold text-heading">
            {item.question}
            <ChevronDown
              size={20}
              strokeWidth={2}
              aria-hidden="true"
              className="accordion-chevron shrink-0 text-text-brand transition-transform duration-200"
            />
          </summary>
          <p className="pb-5 text-text-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  )
}
