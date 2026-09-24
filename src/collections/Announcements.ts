import { isAdmin, isStaff } from '@/access'

import type { CollectionConfig } from 'payload'

/**
 * One row per article that has been announced — to IndexNow, to the social
 * networks, or merely stamped because nothing was configured. Kept apart from
 * Posts on purpose: writing a bookkeeping field on the article would move its
 * `updatedAt`, and that date is what the sitemap's lastmod, the structured
 * data's dateModified and the visible "updated on" line all report. A search
 * engine should see an article change only when a person changes it.
 *
 * Deleting a row makes the distribution job announce the article again on its
 * next pass — the manual "re-announce this" control.
 */
export const Announcements: CollectionConfig = {
  slug: 'announcements',
  labels: { singular: 'Announcement', plural: 'Announcements' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['post', 'announcedAt', 'channels'],
    group: 'Administration',
    description:
      'Articles that have been announced to search engines and social networks. Delete a row to announce the article again.',
  },
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: '-announcedAt',
  fields: [
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'announcedAt',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'channels',
      type: 'text',
      admin: {
        description:
          'Where it went, e.g. "indexnow, facebook, instagram". Empty means nothing was configured.',
      },
    },
  ],
}
