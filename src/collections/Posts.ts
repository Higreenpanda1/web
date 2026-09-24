import { isAdmin, isStaff, isStaffOrPublished } from '@/access'
import { revalidateCollection } from '@/lib/revalidate'
import { bodyField } from '@/fields/richText'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'

import type { CollectionConfig } from 'payload'

/**
 * The blog — the main way people found the old site (brief section 5), so it is
 * the main SEO engine here too. Reading time is computed on save rather than at
 * render, because it has to be right in the Arabic locale as well and counting
 * Arabic words at request time on every list page is wasted work.
 *
 * Beyond the article itself, a post carries the pieces that answer engines and
 * AI assistants lift out of a page: a short list of key takeaways, a set of
 * questions with direct answers (rendered as FAQPage structured data) and the
 * keyword the article targets. Editors can leave all three empty — the
 * enrichment script (`npm run posts:enrich`) fills them in from the body.
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
    {
      name: 'keyTakeaways',
      type: 'array',
      localized: true,
      labels: { singular: 'Takeaway', plural: 'Key takeaways' },
      maxRows: 6,
      admin: {
        description:
          'Three to five one-sentence answers a reader could act on. Shown in a box above the article and quoted by AI assistants.',
      },
      fields: [{ name: 'text', type: 'text', required: true, maxLength: 220 }],
    },
    bodyField(),
    {
      name: 'faqs',
      type: 'array',
      localized: true,
      labels: { singular: 'Question', plural: 'Questions this article answers' },
      maxRows: 8,
      admin: {
        description:
          'Real questions people type into search, each with a direct answer of two or three sentences. Rendered as FAQ structured data.',
      },
      fields: [
        { name: 'question', type: 'text', required: true, maxLength: 200 },
        { name: 'answer', type: 'textarea', required: true, maxLength: 800 },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'A future date schedules the article: it goes live, is indexed and is posted to social media at that time.',
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
      name: 'focusKeyword',
      type: 'text',
      localized: true,
      maxLength: 120,
      admin: {
        position: 'sidebar',
        description: 'The search phrase this article should rank for, in this language.',
      },
    },
    {
      name: 'localesAvailable',
      type: 'select',
      hasMany: true,
      defaultValue: ['ar', 'en'],
      options: [
        { label: 'العربية', value: 'ar' },
        { label: 'English', value: 'en' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Languages this article is actually written in. An article without English is not listed on the English site and carries no English hreflang.',
      },
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
      admin: {
        description: 'Leave empty to show the latest articles from the same category.',
      },
    },
    {
      name: 'legacyPaths',
      type: 'array',
      admin: {
        position: 'sidebar',
        description: 'URLs this article had on the old site. Each one redirects here.',
      },
      fields: [{ name: 'path', type: 'text', required: true }],
    },
    {
      // A fingerprint of the imported source, so re-running the import skips
      // articles that have not changed instead of rewriting an editor's work.
      name: 'importKey',
      type: 'text',
      index: true,
      admin: { hidden: true },
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
    // Publishing drops this collection's cache tag so the change is live at once.
    ...revalidateCollection('posts'),
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

export function countWords(node: unknown): number {
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
