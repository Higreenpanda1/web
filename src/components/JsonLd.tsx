/**
 * Structured data, serialised safely. `<` is escaped so a stray angle bracket
 * in CMS content can never close the script tag early and inject markup —
 * the classic JSON-LD XSS, and exactly the class of bug that took the old site
 * down.
 */
export function JsonLd({ data, nonce }: { data: unknown; nonce?: string }) {
  if (!data) return null

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
