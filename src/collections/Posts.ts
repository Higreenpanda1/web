import { isAdmin, isStaff, isStaffOrPublished } from '@/access'
import { bodyField } from '@/fields/richText'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'

import type { CollectionConfig } from 'payload'

/**
 * The blog — the main way people found the old site (brief section 5), so it is
 * the main SEO engine here too. Reading time is computed on save rather than at
 * render, because it has to be right in the Arabic locale as well and counting
 * Arabic words at request time on every list page is wasted work.
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Article', plural: 'Blog' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', 'categories', '_status'],
    group: 'Content',
    livePreview: {
      url: ({ data, locale }) =>
        `${process.env.NEXT_PUBLIC_SERVER_URL}${locale?.code === 'en' ? '/en' : ''}/blog/${data?.slug ?? ''}`,
    },
  },
  versions: {
    drafts: { autosave: { interval: 800 } },
    maxPerDoc: 40,
  },
  access: {
    read: isStaffOrPublished,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: '-publishedAt',
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField('title'),
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 280,
      admin: { description: 'Shown on the blog index and as the search-result description.' },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    bodyField(),
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'team-members',
      maxDepth: 1,
      admin: { position: 'sidebar' },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      maxDepth: 1,
      admin: { position: 'sidebar' },
    },
    {
      name: 'readingMinutes',
      type: 'number',
      localized: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Calculated on save, per language.',
      },
    },
    {
      name: 'relatedPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      maxDepth: 1,
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    },
    seoField,
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data?.body) {
          data.readingMinutes = estimateReadingMinutes(data.body)
        }
        return data
      },
    ],
  },
}

/**
 * Words per minute differs by script: Arabic readers average noticeably fewer
 * words per minute than English readers for the same content, partly because
 * Arabic packs more meaning into each word. 180 is a fair middle for both; the
 * value is stored per locale so each translation gets its own count.
 */
const WORDS_PER_MINUTE = 180

export function estimateReadingMinutes(node: unknown): number {
  const words = countWords(node)
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

function countWords(node: unknown): number {
  if (typeof node === 'string') {
    const trimmed = node.trim()
    return trimmed ? trimmed.split(/\s+/).length : 0
  }
  if (Array.isArray(node)) return node.reduce<number>((sum, child) => sum + countWords(child), 0)
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    let total = 0
    if (typeof record.text === 'string') total += countWords(record.text)
    if (record.children) total += countWords(record.children)
    if (record.root) total += countWords(record.root)
    return total
  }
  return 0
}
