import { anyone, isAdmin, isStaff } from '@/access'
import { revalidateCollection } from '@/lib/revalidate'
import { slugField } from '@/fields/slug'

import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  // Publishing drops this collection's cache tag so the change is live at once.
  hooks: revalidateCollection('categories'),
  labels: { singular: 'Category', plural: 'Categories' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug'],
    group: 'Content',
  },
  access: {
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField('title'),
    { name: 'description', type: 'textarea', localized: true, maxLength: 180 },
  ],
}
