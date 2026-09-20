import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import type { Field } from 'payload'

/**
 * The body editor. Headings start at H2 because H1 belongs to the page itself —
 * letting an editor add a second H1 breaks both the document outline and the
 * screen-reader experience the brief asks us to test in Arabic.
 */
export function bodyField(overrides: Partial<Field> = {}): Field {
  return {
    name: 'body',
    type: 'richText',
    localized: true,
    editor: lexicalEditor({
      features: ({ defaultFeatures }) => [
        ...defaultFeatures,
        HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
        HorizontalRuleFeature(),
        FixedToolbarFeature(),
        InlineToolbarFeature(),
        BlocksFeature({ blocks: [] }),
      ],
    }),
    ...overrides,
  } as Field
}
