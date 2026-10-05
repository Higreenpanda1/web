import { anyone, isAdmin, isStaff } from '@/access'
import { revalidateCollection } from '@/lib/revalidate'

import type { CollectionConfig } from 'payload'

/** The groups the "From the field" page is arranged in, in display order. */
export const FIELD_KINDS = ['office', 'fair', 'factory', 'market'] as const
export type FieldKind = (typeof FIELD_KINDS)[number]

/**
 * Real photos from the work: guests at the Shenzhen office, the Canton Fair,
 * factory and market visits. The point is credibility, so nothing here is
 * stock and nothing is staged — and nothing shows on the site until someone
 * confirms the people in the photo agreed to appear.
 */
export const FieldMoments: CollectionConfig = {
  slug: 'field-moments',
  hooks: revalidateCollection('fieldMoments'),
  labels: { singular: 'Field photo', plural: 'From the field' },
  admin: {
    useAsTitle: 'caption',
    defaultColumns: ['caption', 'kind', 'takenAt', 'showOnHome', 'consentConfirmed'],
    group: 'Content',
    description:
      'Real photos from meetings, fairs and factory visits. Never name a guest or show a contract, licence, price or screen without their permission.',
  },
  access: {
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: '-takenAt',
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    {
      name: 'caption',
      type: 'text',
      required: true,
      localized: true,
      maxLength: 140,
      admin: {
        description:
          'One line: what happened and where. e.g. "Receiving a trader from Sudan at our Shenzhen office".',
      },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'office',
      options: [
        { label: 'Office meeting', value: 'office' },
        { label: 'Trade fair', value: 'fair' },
        { label: 'Factory visit', value: 'factory' },
        { label: 'Market visit', value: 'market' },
      ],
    },
    {
      name: 'takenAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'monthOnly', displayFormat: 'MMMM yyyy' } },
    },
    {
      name: 'consentConfirmed',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Tick only once the people in the photo agreed to appear on the website. Unticked photos are not shown.',
      },
    },
    {
      name: 'showOnHome',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Up to six are shown on the homepage.' },
    },
    { name: 'order', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
  ],
}
