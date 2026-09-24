import {
  RichText as LexicalRichText,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'

import { cn } from '@/lib/cn'
import { nodeText, uniqueAnchor } from '@/lib/lexical'
import { mediaSrc } from '@/lib/seo'

import type { Media } from '@/payload-types'
import type {
  SerializedEditorState,
  SerializedLexicalNode,
} from '@payloadcms/richtext-lexical/lexical'

/**
 * Renders Payload's Lexical body content. `.prose-hgp` supplies the reading
 * measure, the vertical rhythm and the logical-property list indents, so the
 * Arabic and English renderings share one stylesheet and no RTL override.
 *
 * Two converters are overridden:
 *   - headings get an `id`, so the table of contents and shared links can
 *     point at a section (the id scheme is `anchorId` in src/lib/lexical.ts,
 *     the same function the table of contents uses)
 *   - uploads render through next/image with a same-origin src; the default
 *     converter emits a plain <img> with the absolute URL the image optimiser
 *     refuses (see `mediaSrc`)
 */
export function RichText({ data, className }: { data: unknown; className?: string }) {
  if (!data) return null

  // Heading ids are numbered per document, so the counter lives per render.
  const seen = new Map<string, number>()

  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    heading: ({ node, nodesToJSX }) => {
      const heading = node as SerializedLexicalNode & {
        tag: string
        children: SerializedLexicalNode[]
      }
      const Tag = heading.tag as 'h2' | 'h3' | 'h4'
      const id =
        Tag === 'h2' || Tag === 'h3' ? uniqueAnchor(nodeText(heading as never), seen) : undefined
      return (
        <Tag id={id} className={id ? 'scroll-mt-28' : undefined}>
          {nodesToJSX({ nodes: heading.children })}
        </Tag>
      )
    },
    upload: ({ node }) => {
      const upload = node as SerializedLexicalNode & {
        relationTo: string
        value: Media | number | string
      }
      if (upload.relationTo !== 'media' || typeof upload.value !== 'object') return null
      const media = upload.value as Media
      const src = mediaSrc(media, 'feature')
      if (!src) return null
      const width = media.sizes?.feature?.width ?? media.width ?? 1280
      const height = media.sizes?.feature?.height ?? media.height ?? 720
      return (
        <figure className="my-8">
          <Image
            src={src}
            alt={media.alt ?? ''}
            width={width}
            height={height}
            sizes="(min-width: 900px) 68ch, 100vw"
            className="h-auto w-full rounded-lg"
          />
          {media.caption ? (
            <figcaption className="mt-2 text-caption text-text-muted">{media.caption}</figcaption>
          ) : null}
        </figure>
      )
    },
  })

  return (
    <div className={cn('prose-hgp', className)}>
      <LexicalRichText data={data as SerializedEditorState} converters={converters} />
    </div>
  )
}
