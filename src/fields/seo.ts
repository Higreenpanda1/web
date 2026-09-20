import type { Field } from 'payload'

/**
 * Per-document SEO overrides. Every field is optional and localised; when it is
 * empty the route falls back to the document's own title and summary, so an
 * editor never has to fill these in to get correct metadata.
 */
export const seoField: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO',
  admin: {
    description: 'Optional. Leave empty to use the page title and summary.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      maxLength: 70,
      admin: { description: 'Around 60 characters. Shown as the blue link in search results.' },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      maxLength: 180,
      admin: { description: 'Around 155 characters. Shown under the link in search results.' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: '1200 × 630. Falls back to the brand OG image.' },
    },
    {
      name: 'noindex',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Keep this page out of search engines.' },
    },
  ],
}
