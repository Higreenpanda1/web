import { isAdmin, isStaff, noone } from '@/access'

import type { CollectionConfig } from 'payload'

/**
 * Lead capture. Stored in Postgres AND emailed — never email-only. An enquiry
 * that exists solely as a message in an inbox can be lost to a filter, a
 * deletion or a provider problem, and nobody would know how many.
 *
 * Shaped for the phase-2 quotation flow from the start: `status` moves an
 * enquiry from new → contacted → quoted → won/lost, `assignedTo` gives it an
 * owner, and `customer` links it to a portal account once one exists. Adding a
 * `quotes` relationship later is then one field, not a rewrite of the table.
 *
 * `create` access is closed on purpose. Submissions arrive through the server
 * action in src/app/actions/enquiry.ts, which uses Payload's local API and so
 * bypasses access control deliberately — that keeps POST /api/enquiries shut to
 * the internet while the form itself still works.
 */
export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  labels: { singular: 'Enquiry', plural: 'Enquiries' },
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'name', 'country', 'service', 'status', 'createdAt'],
    group: 'Leads',
    description: 'Every submission from the website form. Nothing here is public.',
  },
  access: {
    read: isStaff,
    create: noone,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: '-createdAt',
  timestamps: true,
  fields: [
    {
      name: 'reference',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Quoted', value: 'quoted' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
        { label: 'Spam', value: 'spam' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      maxDepth: 1,
      admin: { position: 'sidebar' },
    },
    {
      // Populated in phase 2 when an enquiry belongs to a portal account.
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      maxDepth: 1,
      admin: {
        position: 'sidebar',
        description: 'Phase 2 — links this enquiry to a client portal account.',
      },
    },

    { name: 'name', type: 'text', required: true },
    { name: 'country', type: 'text', required: true, index: true },
    {
      name: 'whatsapp',
      type: 'text',
      required: true,
      admin: { description: 'E.164, e.g. +966501234567.' },
    },
    { name: 'email', type: 'email' },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      maxDepth: 1,
      admin: {
        description: 'Empty when the visitor chose “something else”, or skipped the question.',
      },
    },
    {
      name: 'serviceOther',
      type: 'text',
      admin: {
        readOnly: true,
        description:
          'Set when the visitor chose “something else”. Blank means they skipped the question.',
      },
    },
    { name: 'message', type: 'textarea', required: true },

    {
      name: 'internalNotes',
      type: 'textarea',
      admin: { description: 'Never leaves the CMS.' },
    },

    {
      name: 'meta',
      type: 'group',
      admin: {
        description: 'Captured automatically. Useful when judging whether a lead is genuine.',
      },
      fields: [
        {
          name: 'locale',
          type: 'select',
          options: [
            { label: 'العربية', value: 'ar' },
            { label: 'English', value: 'en' },
          ],
          admin: { readOnly: true },
        },
        { name: 'sourcePath', type: 'text', admin: { readOnly: true } },
        { name: 'referrer', type: 'text', admin: { readOnly: true } },
        {
          name: 'userAgent',
          type: 'text',
          admin: { readOnly: true },
        },
        {
          // Truncated to a /24 before storage — enough to spot a flood of
          // submissions from one network, not enough to track an individual.
          name: 'ipPrefix',
          type: 'text',
          admin: {
            readOnly: true,
            description: 'Network prefix only; the full address is never stored.',
          },
        },
        {
          name: 'submittedAt',
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'notifiedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'When the notification email was accepted by the provider. Empty means it failed — the enquiry is still safe here.',
      },
    },
  ],
}
