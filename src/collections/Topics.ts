import { isAdmin, isStaff } from '@/access'

import type { CollectionConfig } from 'payload'

/**
 * The content queue. Each topic is one article that should exist: the search
 * phrase it targets, the category it belongs to and a two-line brief. The
 * weekly draft job (`src/lib/automation/drafts.ts`) takes the next queued topic,
 * writes a bilingual draft with Claude and leaves it in the blog as a draft for
 * the owner to review. Nothing is published without a person pressing Publish.
 *
 * Editors add topics here from what customers ask on WhatsApp — those questions
 * are the best keyword research this business has.
 */
export const Topics: CollectionConfig = {
  slug: 'topics',
  labels: { singular: 'Topic', plural: 'Content queue' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'priority', 'status', 'scheduledFor'],
    group: 'Content',
    description:
      'Articles waiting to be written. The weekly draft job takes the highest priority queued topic and writes a draft for review.',
  },
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: 'priority',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'Working title. The draft may improve on it.' },
    },
    {
      name: 'keyword',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'The exact search phrase to target, in this language.' },
    },
    {
      name: 'brief',
      type: 'textarea',
      localized: true,
      admin: {
        description:
          'What the article must cover, who it is for, and any figures or steps it has to include. Two to five lines.',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'priority',
      type: 'number',
      defaultValue: 50,
      admin: { position: 'sidebar', description: 'Lower is sooner. 10 is urgent, 90 is someday.' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Drafted — waiting for review', value: 'drafted' },
        { label: 'Published', value: 'published' },
        { label: 'Dropped', value: 'dropped' },
      ],
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'scheduledFor',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Optional. The job will not draft this topic before this date.',
      },
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'The draft written for this topic.',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Anything the writer should know. Not published.' },
    },
  ],
}
