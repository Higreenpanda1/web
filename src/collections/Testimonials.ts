import { anyone, isAdmin, isStaff } from '@/access'

import type { CollectionConfig } from 'payload'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: { singular: 'Testimonial', plural: 'Testimonials' },
  admin: {
    useAsTitle: 'author',
    defaultColumns: ['author', 'country', 'featured', 'order'],
    group: 'Content',
    description:
      'Real words from real customers. Brief section 10: never stock-photo optimism — if a quote reads like marketing, do not publish it.',
  },
  access: {
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'quote',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 400,
    },
    { name: 'author', type: 'text', required: true },
    { name: 'role', type: 'text', localized: true, admin: { description: 'e.g. importer, Riyadh' } },
    { name: 'country', type: 'text', admin: { description: 'ISO 3166-1 alpha-2, e.g. SA.' } },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    {
      name: 'serviceUsed',
      type: 'relationship',
      relationTo: 'services',
      maxDepth: 1,
    },
    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
  ],
}
