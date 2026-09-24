import { List } from 'lucide-react'

import type { Heading } from '@/lib/lexical'

/**
 * The article's own headings as a jump list. Plain anchors — no JavaScript,
 * no scroll spy — because the value is a reader on a phone seeing what the
 * article covers before committing to it, and a crawler seeing the outline.
 * Shown only when there is enough structure to be worth a list.
 */
export function TableOfContents({ headings, title }: { headings: Heading[]; title: string }) {
  if (headings.length < 3) return null

  return (
    <nav
      aria-labelledby="toc-heading"
      className="rounded-lg border border-border-soft bg-surface-sunken p-5"
    >
      <p
        id="toc-heading"
        className="flex items-center gap-2 text-eyebrow font-bold tracking-[0.14em] text-text-brand uppercase"
      >
        <List size={16} strokeWidth={2} aria-hidden="true" />
        {title}
      </p>
      <ol className="mt-3 list-none space-y-1.5 p-0 text-caption">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? 'ps-4' : undefined}>
            <a
              href={`#${heading.id}`}
              className="block py-0.5 text-text no-underline hover:text-text-brand hover:underline"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
