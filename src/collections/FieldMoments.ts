import { anyone, isAdmin, isStaff } from '@/access'
import { revalidateCollection } from '@/lib/revalidate'

import type { CollectionConfig } from 'payload'

/** The groups the "From the field" page is arranged in, in display order. */
export const FIELD_KINDS = ['office', 'fair', 'factory', 'market'] as const
export type FieldKind = (typeof FIELD_KINDS)[number]

/**
 * One entry per real meeting or visit — a client at the Shenzhen office, a
 * day at the Canton Fair, a factory visit — with all of its photos, which the
 * site shows as a slideshow. The point is credibility, so nothing here is
 * stock and nothing is staged — and nothing shows on the site until someone
 * confirms the people in the photos agreed to appear.
 */
export const FieldMoments: CollectionConfig = {
  slug: 'field-moments',
  hooks: revalidateCollection('fieldMoments'),
  labels: { singular: 'Field visit', plural: 'From the field' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'takenAt', 'showOnHome', 'consentConfirmed'],
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
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      maxLength: 140,
      admin: {
        description:
          'One line: who and where. e.g. "Receiving an investor from South Sudan at our Shenzhen office".',
      },
    },
    {
      name: 'photos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      required: true,
      minRows: 1,
      maxRows: 12,
      admin: {
        description: 'The first photo is the cover. They rotate on the site in this order.',
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
      admin: {
        position: 'sidebar',
        description:
          'Comes first in its group’s rotating photo, on the homepage and the field page.',
      },
    },
    { name: 'order', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
  ],
}
