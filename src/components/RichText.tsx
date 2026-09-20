import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'

import { cn } from '@/lib/cn'

import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

/**
 * Renders Payload's Lexical body content. `.prose-hgp` supplies the reading
 * measure, the vertical rhythm and the logical-property list indents, so the
 * Arabic and English renderings share one stylesheet and no RTL override.
 */
export function RichText({ data, className }: { data: unknown; className?: string }) {
  if (!data) return null

  return (
    <div className={cn('prose-hgp', className)}>
      <LexicalRichText data={data as SerializedEditorState} />
    </div>
  )
}
