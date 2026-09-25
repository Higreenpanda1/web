import { isAdmin, isStaff, isStaffOrPublished } from '@/access'
import { SERVICE_ICONS } from '@/lib/catalogue'
import { revalidateCollection } from '@/lib/revalidate'
import { bodyField } from '@/fields/richText'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'

import type { ApplicationType, PriceUnit, ServiceCategory, ServiceIconName } from '@/lib/catalogue'
import type { CollectionConfig } from 'payload'

const ICON_LABELS: Record<ServiceIconName, string> = {
  search: 'Search — sourcing',
  factory: 'Factory — manufacturing',
  'clipboard-check': 'Clipboard check — inspection',
  ship: 'Ship — freight',
  building: 'Building — company formation',
  route: 'Route — full import management',
  'shopping-cart': 'Shopping cart — e-commerce',
  lightbulb: 'Lightbulb — consulting',
  tent: 'Tent — trade fairs',
  package: 'Package — general',
  plane: 'Plane — visas',
  'file-check': 'File check — invitation letter',
  'id-card': 'ID card — work visa and residence',
  users: 'Users — family',
  landmark: 'Landmark — bank account',
  wallet: 'Wallet — Alipay and WeChat Pay',
  store: 'Store — marketplace store',
  calculator: 'Calculator — accounting and tax',
  'map-pin': 'Map pin — registered address',
  'badge-check': 'Badge check — trademark',
  'file-pen': 'File pen — licence changes',
}

/**
 * Twenty-one services: the eight from brief section 4, trade-fair accompaniment
 * (confirmed 20 September 2026), eleven recovered from the old site’s
 * database on 23 September 2026 — visas, accounts, trademark, store setup,
 * accounting, address — and the Hong Kong company package from the owner's
 * price list of 25 September 2026. They are grouped by `category` on the index, carry a
 * "from" price, and may point at one of the structured application forms.
 *
 * Each is one document with both locales on it — Payload's own localisation,
 * not two parallel trees — so an editor translates in place and the slug stays
 * shared between /services/x and /en/services/x.
 */
export const Services: CollectionConfig = {
  slug: 'services',
  // Publishing drops this collection's cache tag so the change is live at once.
  hooks: revalidateCollection('services'),
  labels: { singular: 'Service', plural: 'Services' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'priceFrom', 'featured', 'order', '_status'],
    group: 'Content',
    livePreview: {
      url: ({ data, locale }) =>
        `${process.env.NEXT_PUBLIC_SERVER_URL}${locale?.code === 'en' ? '/en' : ''}/services/${data?.slug ?? ''}`,
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
  defaultSort: 'order',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    slugField('title'),
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      localized: true,
      maxLength: 240,
      admin: {
        description:
          'One or two sentences, in the customer’s words rather than ours. Shown on the services index and in search results.',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'import',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Which group this service is listed under on the services page and in the footer.',
      },
      options: [
        { label: 'Import & sourcing', value: 'import' },
        { label: 'Company & compliance', value: 'company' },
        { label: 'Banking & payments', value: 'banking' },
        { label: 'E-commerce', value: 'ecommerce' },
        { label: 'Visas & travel', value: 'visas' },
        { label: 'Consulting', value: 'consulting' },
      ] satisfies Array<{ label: string; value: ServiceCategory }>,
    },
    {
      name: 'icon',
      type: 'select',
      required: true,
      defaultValue: 'search',
      admin: {
        position: 'sidebar',
        description: 'Single-weight line icon, from the Lucide set (brief section 15).',
      },
      options: SERVICE_ICONS.map((value) => ({ label: ICON_LABELS[value], value })),
    },
    {
      type: 'row',
      fields: [
        {
          name: 'priceFrom',
          type: 'number',
          min: 0,
          admin: {
            width: '50%',
            description:
              'Starting price in Chinese yuan, whole numbers. Shown as “from ¥8,200”. Leave empty to show no price.',
          },
        },
        {
          name: 'priceUnit',
          type: 'select',
          defaultValue: 'once',
          admin: { width: '50%', description: 'What the starting price is per.' },
          options: [
            { label: 'One-off', value: 'once' },
            { label: 'Per year', value: 'year' },
            { label: 'Per month', value: 'month' },
            { label: 'Per trademark class', value: 'class' },
          ] satisfies Array<{ label: string; value: PriceUnit }>,
        },
      ],
    },
    {
      name: 'applicationType',
      type: 'select',
      admin: {
        position: 'sidebar',
        description:
          'A structured request form for this service. When set, the page leads with “Start your application” instead of the general enquiry form.',
      },
      options: [
        { label: 'Consultation request', value: 'consultation' },
        { label: 'Company registration', value: 'company-registration' },
        { label: 'Business invitation letter (M visa)', value: 'visa-invitation' },
        { label: 'Visa application', value: 'visa' },
        { label: 'Product search', value: 'product-search' },
        { label: 'Shipping quote', value: 'shipping-quote' },
        { label: 'Account opening', value: 'account-opening' },
        { label: 'Marketplace store setup', value: 'store-setup' },
        { label: 'Trademark registration', value: 'trademark' },
      ] satisfies Array<{ label: string; value: ApplicationType }>,
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'The flagship offering. Shown larger on the services index and the homepage.',
      },
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 100,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers come first.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'A real photograph — a factory floor, an inspection, a container. Not stock (brief section 15).',
      },
    },
    bodyField(),
    {
      name: 'highlights',
      type: 'array',
      localized: true,
      maxRows: 6,
      labels: { singular: 'Point', plural: 'What is included' },
      admin: { description: 'Concrete, checkable points. Say what happens, in what order.' },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'requirements',
      type: 'array',
      localized: true,
      maxRows: 10,
      labels: { singular: 'Item', plural: 'What the client needs to prepare' },
      admin: {
        description:
          'Documents and information the client must have ready — a passport copy, three company names, a business licence. Shown as a checklist on the page and repeated on the application form.',
      },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'faqs',
      type: 'array',
      localized: true,
      labels: { singular: 'Question', plural: 'Frequent questions' },
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
    {
      name: 'relatedServices',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      maxDepth: 1,
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    },
    seoField,
  ],
}
