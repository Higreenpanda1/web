import { isAdmin, isStaff, isStaffOrPublished } from '@/access'
import { layoutBlocks } from '@/blocks'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'

import type { CollectionConfig } from 'payload'

/**
 * Flexible, block-based pages. The homepage is a Page with the slug `home`; the
 * legal pages are Pages too. Routes that need their own data (services, blog,
 * contact) are React routes rather than Pages, because their content comes from
 * their own collections — but each can still be given an intro Page later
 * without changing this schema.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    group: 'Content',
    livePreview: {
      url: ({ data, locale }) => {
        const prefix = locale?.code === 'en' ? '/en' : ''
        const slug = data?.slug === 'home' ? '' : `/${data?.slug ?? ''}`
        return `${process.env.NEXT_PUBLIC_SERVER_URL}${prefix}${slug || '/'}`
      },
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
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField('title'),
    {
      name: 'layout',
      type: 'blocks',
      localized: false,
      // The block *list* is shared between locales while every text field
      // inside it is localised. One page, two languages, one layout — which is
      // what stops the Arabic and English versions drifting apart structurally.
      blocks: layoutBlocks,
      admin: { initCollapsed: false },
    },
    seoField,
  ],
}
