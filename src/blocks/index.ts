import { bodyField } from '@/fields/richText'

import type { Block } from 'payload'

/**
 * Layout blocks for the flexible `Pages` collection. Each one maps to exactly
 * one React component in src/components/blocks/, and the `blockType` union is
 * what the renderer switches on. Adding a block means adding it in both places
 * and nowhere else.
 *
 * Every block is localised at the field level, so one page document carries
 * both languages and the editor translates in place.
 */

const linkFields: Block['fields'] = [
  { name: 'label', type: 'text', required: true, localized: true },
  {
    name: 'href',
    type: 'text',
    required: true,
    admin: { description: 'A path such as /services, or a full https:// URL.' },
  },
  {
    name: 'style',
    type: 'select',
    defaultValue: 'primary',
    options: [
      { label: 'Primary button', value: 'primary' },
      { label: 'Secondary button', value: 'secondary' },
      { label: 'Plain link', value: 'link' },
    ],
  },
]

export const HeroBlock: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    { name: 'eyebrow', type: 'text', localized: true },
    { name: 'heading', type: 'text', required: true, localized: true },
    { name: 'lead', type: 'textarea', localized: true },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'A real photograph. Text over it gets a brand-900 overlay at 55%.' },
    },
    { name: 'actions', type: 'array', maxRows: 2, fields: linkFields },
  ],
}

export const RichTextBlock: Block = {
  slug: 'richText',
  labels: { singular: 'Text', plural: 'Text sections' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    bodyField({ name: 'content' }),
  ],
}

export const ServicesGridBlock: Block = {
  slug: 'servicesGrid',
  labels: { singular: 'Services grid', plural: 'Services grids' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    { name: 'lead', type: 'textarea', localized: true },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'all',
      options: [
        { label: 'Every published service, in order', value: 'all' },
        { label: 'Only featured services', value: 'featured' },
        { label: 'A hand-picked list', value: 'manual' },
      ],
    },
    {
      name: 'services',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      maxDepth: 1,
      admin: { condition: (_, sibling) => sibling?.source === 'manual' },
    },
    { name: 'limit', type: 'number', defaultValue: 9, min: 1, max: 24 },
  ],
}

export const StatsBlock: Block = {
  slug: 'stats',
  labels: { singular: 'Numbers', plural: 'Numbers' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'items',
      type: 'array',
      minRows: 2,
      maxRows: 4,
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: { description: 'Western Arabic numerals in both languages, e.g. 235+.' },
        },
        { name: 'label', type: 'text', required: true, localized: true },
      ],
    },
  ],
}

export const ProcessBlock: Block = {
  slug: 'process',
  labels: { singular: 'Process', plural: 'Processes' },
  admin: {
    // Brief section 15: draw the actual import process as a numbered flow.
    // That is useful content, not decoration.
  },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    { name: 'lead', type: 'textarea', localized: true },
    {
      name: 'steps',
      type: 'array',
      minRows: 2,
      maxRows: 6,
      fields: [
        { name: 'title', type: 'text', required: true, localized: true },
        { name: 'body', type: 'textarea', required: true, localized: true },
      ],
    },
  ],
}

export const ImageTextBlock: Block = {
  slug: 'imageText',
  labels: { singular: 'Image and text', plural: 'Image and text' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    { name: 'body', type: 'textarea', required: true, localized: true },
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    {
      name: 'imagePosition',
      type: 'select',
      defaultValue: 'start',
      options: [
        // Logical, not left/right: "start" is the left in English and the right
        // in Arabic, which is what an editor actually means.
        { label: 'Start of the line (left in English, right in Arabic)', value: 'start' },
        { label: 'End of the line (right in English, left in Arabic)', value: 'end' },
      ],
    },
    { name: 'actions', type: 'array', maxRows: 2, fields: linkFields },
  ],
}

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  labels: { singular: 'Testimonials', plural: 'Testimonials' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'featured',
      options: [
        { label: 'Featured testimonials', value: 'featured' },
        { label: 'A hand-picked list', value: 'manual' },
      ],
    },
    {
      name: 'testimonials',
      type: 'relationship',
      relationTo: 'testimonials',
      hasMany: true,
      maxDepth: 1,
      admin: { condition: (_, sibling) => sibling?.source === 'manual' },
    },
  ],
}

export const FounderBlock: Block = {
  slug: 'founder',
  labels: { singular: 'Founder', plural: 'Founder' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'team-members',
      required: true,
      maxDepth: 1,
    },
    { name: 'actions', type: 'array', maxRows: 2, fields: linkFields },
  ],
}

export const LatestPostsBlock: Block = {
  slug: 'latestPosts',
  labels: { singular: 'Latest articles', plural: 'Latest articles' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    { name: 'lead', type: 'textarea', localized: true },
    { name: 'limit', type: 'number', defaultValue: 3, min: 1, max: 9 },
  ],
}

export const FaqBlock: Block = {
  slug: 'faq',
  labels: { singular: 'Questions', plural: 'Questions' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      localized: true,
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
  ],
}

export const CtaBlock: Block = {
  slug: 'cta',
  labels: { singular: 'Call to action', plural: 'Calls to action' },
  fields: [
    { name: 'heading', type: 'text', required: true, localized: true },
    { name: 'body', type: 'textarea', localized: true },
    { name: 'actions', type: 'array', maxRows: 2, fields: linkFields },
    {
      name: 'showEnquiryForm',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Put the full enquiry form in this section.' },
    },
  ],
}

export const layoutBlocks: Block[] = [
  HeroBlock,
  RichTextBlock,
  ServicesGridBlock,
  StatsBlock,
  ProcessBlock,
  ImageTextBlock,
  FounderBlock,
  TestimonialsBlock,
  LatestPostsBlock,
  FaqBlock,
  CtaBlock,
]
