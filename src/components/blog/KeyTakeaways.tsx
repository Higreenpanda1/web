import { CheckCircle2 } from 'lucide-react'

/**
 * The answer box. Three to five sentences a reader can act on without reading
 * further — and the block an answer engine lifts when it quotes the article.
 * Marked `data-speakable` so the BlogPosting schema can point at it.
 */
export function KeyTakeaways({ items, title }: { items: Array<{ text: string }>; title: string }) {
  if (items.length === 0) return null

  return (
    <aside
      aria-labelledby="takeaways-heading"
      data-speakable
      className="rounded-lg border border-brand-200 bg-surface-tint-soft p-6"
    >
      <h2 id="takeaways-heading" className="text-h3 mt-0">
        {title}
      </h2>
      <ul className="mt-4 list-none space-y-3 p-0">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckCircle2
              size={20}
              strokeWidth={2}
              aria-hidden="true"
              className="mt-1 shrink-0 text-brand-600"
            />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
