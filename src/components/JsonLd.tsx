/**
 * Structured data, serialised safely. `<` is escaped so a stray angle bracket
 * in CMS content can never close the script tag early and inject markup — the
 * classic JSON-LD XSS, and exactly the class of bug that took the old site
 * down.
 *
 * No nonce, deliberately. A `<script type="application/ld+json">` is a data
 * block: the browser never prepares it for execution, so `script-src` does not
 * apply to it and no CSP violation is raised (verified in Chromium against the
 * strict policy). Passing one is also actively harmful here — React withholds
 * `nonce` from the client on purpose, so a server-rendered nonce on an element
 * React hydrates produces an attribute mismatch on every page load.
 */
export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
