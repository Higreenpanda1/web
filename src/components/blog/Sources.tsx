import { ExternalLink } from 'lucide-react'

import type { Post } from '@/payload-types'

type Source = NonNullable<Post['sources']>[number]

/**
 * Where the figures came from. Shown as a plain numbered list at the end of
 * the article — the same list the structured data carries as `citation`.
 * Readers of a customs article want the tariff page; answer engines want to
 * see that the numbers have a home.
 */
export function Sources({ items, title, lead }: { items: Source[]; title: string; lead: string }) {
  const valid = items.filter((item) => item.url && /^https?:\/\//.test(item.url))
  if (valid.length === 0) return null
  return (
    <section aria-labelledby="sources-heading" className="mt-12 border-t border-border-soft pt-8">
      <h2 id="sources-heading" className="text-h3">
        {title}
      </h2>
      <p className="mt-1 text-caption text-text-muted">{lead}</p>
      <ol className="mt-4 space-y-2 ps-5 text-body">
        {valid.map((item) => (
          <li key={item.id ?? item.url}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5"
            >
              {item.title}
              <ExternalLink aria-hidden="true" className="size-3.5 opacity-70" />
            </a>
            <span className="ms-2 text-caption text-text-muted" dir="ltr">
              {item.publisher || hostOf(item.url)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
