import { isAdmin, isStaff, isStaffOrPublished } from '@/access'
import { revalidateCollection } from '@/lib/revalidate'
import { bodyField } from '@/fields/richText'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'

import type { CollectionConfig } from 'payload'

/**
 * The eight services from brief section 4. Each is one document with both
 * locales on it — Payload's own localisation, not two parallel trees — so an
 * editor translates in place and the slug stays shared between /services/x and
 * /en/services/x.
 *
 * The icon list below includes `tent` for trade-fair accompaniment, which the
 * brief suggests and marks [confirm]. It is not seeded, because nobody has
 * confirmed the business sells it. Adding it later is a new document in the
 * admin panel — no deploy, no migration.
 */
export const Services: CollectionConfig = {
  slug: 'services',
  // Publishing drops this collection's cache tag so the change is live at once.
  hooks: revalidateCollection('services'),
  labels: { singular: 'Service', plural: 'Services' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'featured', 'order', '_status'],
    group: 'Content',
    livePreview: {
      url: ({ data, locale }) =>
        `${process.env.NEXT_PUBLIC_SERVER_URL}${locale?.code === 'en' ? '/en' : ''}/services/${data?.slug ?? ''}`,
    },
  },
  versions: {
    drafts: { autosave: { interval: 800 } },
    maxPerDoc: 25,
  },
  access: {
    read: isStaffOrPublished,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    slugField('title'),
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 240,
      admin: {
        description:
          'One or two sentences, in the customer’s words rather than ours. Shown on the services index and in search results.',
      },
    },
    {
      name: 'icon',
      type: 'select',
      required: true,
      defaultValue: 'search',
      admin: {
        position: 'sidebar',
        description: 'Single-weight line icon, from the Lucide set (brief section 15).',
      },
      options: [
        { label: 'Search — sourcing', value: 'search' },
        { label: 'Factory — manufacturing', value: 'factory' },
        { label: 'Clipboard check — inspection', value: 'clipboard-check' },
        { label: 'Ship — freight', value: 'ship' },
        { label: 'Building — company formation', value: 'building' },
        { label: 'Route — full import management', value: 'route' },
        { label: 'Shopping cart — e-commerce', value: 'shopping-cart' },
        { label: 'Lightbulb — consulting', value: 'lightbulb' },
        { label: 'Tent — trade fairs', value: 'tent' },
        { label: 'Package — general', value: 'package' },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'The flagship offering. Shown larger on the services index and the homepage.',
      },
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 100,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers come first.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'A real photograph — a factory floor, an inspection, a container. Not stock (brief section 15).',
      },
    },
    bodyField(),
    {
      name: 'highlights',
      type: 'array',
      localized: true,
      maxRows: 6,
      labels: { singular: 'Point', plural: 'What is included' },
      admin: { description: 'Concrete, checkable points. Say what happens, in what order.' },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'faqs',
      type: 'array',
      localized: true,
      labels: { singular: 'Question', plural: 'Frequent questions' },
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
    {
      name: 'relatedServices',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      maxDepth: 1,
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    },
    seoField,
  ],
}
