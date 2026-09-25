import { anyone, isAdmin, isStaff } from '@/access'
import { revalidateCollection } from '@/lib/revalidate'
import { slugField } from '@/fields/slug'

import type { CollectionConfig } from 'payload'

/**
 * The audience follows the person, not just the company (brief section 3) —
 * 46K on Instagram, 29K on YouTube. The founder record drives the About page
 * and the blog byline, so it carries the credentials rather than having them
 * hard-coded in a component.
 */
export const TeamMembers: CollectionConfig = {
  slug: 'team-members',
  // Publishing drops this collection's cache tag so the change is live at once.
  hooks: revalidateCollection('team'),
  labels: { singular: 'Team member', plural: 'Team' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'isFounder', 'order'],
    group: 'Content',
  },
  access: {
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    slugField('name'),
    { name: 'role', type: 'text', required: true, localized: true },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    {
      name: 'bio',
      type: 'textarea',
      localized: true,
      admin: { description: 'Lead with what they do for the customer, not a CV.' },
    },
    {
      name: 'credentials',
      type: 'array',
      localized: true,
      labels: { singular: 'Credential', plural: 'Credentials' },
      admin: { description: 'Real numbers. 235+ cities. 100+ trade fairs. Named awards.' },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'timeline',
      type: 'array',
      localized: true,
      labels: { singular: 'Milestone', plural: 'Career and education' },
      admin: {
        description:
          'The CV as a visitor should read it: newest first. Work, study, awards and courses. Shown on the About page under the founder.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'kind',
              type: 'select',
              required: true,
              defaultValue: 'work',
              admin: { width: '40%' },
              options: [
                { label: 'Work', value: 'work' },
                { label: 'Education', value: 'education' },
                { label: 'Award', value: 'award' },
                { label: 'Course', value: 'course' },
              ],
            },
            {
              name: 'period',
              type: 'text',
              required: true,
              admin: { width: '60%', description: '“2023 – now”, “2020 – 2022”, “2021”.' },
            },
          ],
        },
        { name: 'title', type: 'text', required: true },
        { name: 'organisation', type: 'text' },
        {
          name: 'note',
          type: 'textarea',
          admin: { description: 'One or two sentences on what was done there. Optional.' },
        },
      ],
    },
    {
      name: 'isFounder',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    { name: 'order', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    {
      name: 'links',
      type: 'group',
      fields: [
        { name: 'instagram', type: 'text' },
        { name: 'youtube', type: 'text' },
        { name: 'linkedin', type: 'text' },
        { name: 'email', type: 'email' },
      ],
    },
  ],
}
