import { hasRole, isAdmin, isStaff, noone } from '@/access'
import { APPLICATION_TYPES } from '@/lib/catalogue'

import type { CollectionConfig } from 'payload'

const TYPE_LABELS: Record<(typeof APPLICATION_TYPES)[number], string> = {
  consultation: 'Consultation request',
  'company-registration': 'Company registration',
  'visa-invitation': 'Business invitation letter (M visa)',
  visa: 'Visa application',
  'product-search': 'Product search',
  'shipping-quote': 'Shipping quote',
  'account-opening': 'Account opening',
  'store-setup': 'Marketplace store setup',
  trademark: 'Trademark registration',
}

/**
 * Structured requests: a company registration, a visa invitation, a shipping
 * quote. The old WordPress site had seventeen separate form plugins for these
 * and their submissions lived in seventeen places; here every request is one
 * row with a `type`, the common contact fields as real columns (so the list
 * view can filter and search them), and the type-specific answers in `details`
 * as JSON, rendered read-only in the admin.
 *
 * File uploads: none until 4 October 2026, when the owner asked for the
 * passport photo page and the China entry stamp to come with a company
 * registration (formation cannot start without them). They are checked by
 * their bytes and kept in a private folder no route serves
 * (src/lib/documents.ts, src/lib/documents-store.ts); `details` records the
 * stored file name and size, and the files themselves reach the team as
 * email attachments and in HubSpot. Other documents are still requested by
 * email or WhatsApp.
 *
 * Like Enquiries, `create` is closed: submissions come through the server
 * action in src/app/actions/application.ts, using the local API.
 */
export const Applications: CollectionConfig = {
  slug: 'applications',
  labels: { singular: 'Application', plural: 'Applications' },
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'type', 'name', 'country', 'status', 'createdAt'],
    group: 'Leads',
    description:
      'Structured requests from the application forms — company registration, visas, accounts, store setup, quotes. Nothing here is public.',
  },
  access: {
    read: isStaff,
    create: noone,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: '-createdAt',
  timestamps: true,
  endpoints: [
    {
      // The "Resend to HubSpot" button: POST /api/applications/:id/hubspot.
      path: '/:id/hubspot',
      method: 'post',
      handler: async (req) => {
        if (!hasRole(req.user, 'admin', 'editor')) {
          return Response.json({ ok: false, error: 'Not allowed.' }, { status: 403 })
        }
        const id = Number(req.routeParams?.id)
        const application = await req.payload
          .findByID({ collection: 'applications', id, depth: 0, req })
          .catch(() => null)
        if (!application) {
          return Response.json({ ok: false, error: 'Not found.' }, { status: 404 })
        }
        // Loaded here, not at the top: the CLI (migrations) reads this file too.
        const { resendApplicationToHubSpot } = await import('@/lib/hubspot-resend')
        const result = await resendApplicationToHubSpot(req.payload, application)
        return Response.json(result, { status: result.ok ? 200 : 502 })
      },
    },
  ],
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
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true },
      options: APPLICATION_TYPES.map((value) => ({ label: TYPE_LABELS[value], value })),
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
        { label: 'Documents requested', value: 'documents' },
        { label: 'In progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
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
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      maxDepth: 1,
      admin: {
        position: 'sidebar',
        description: 'The service page the visitor started from, when there was one.',
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
      name: 'headline',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'One line summarising the request, built from the answers.',
      },
    },
    {
      // The type-specific answers. Stored as submitted (after validation), keyed
      // by field name from src/forms/definitions.ts. JSON rather than one
      // group per type: nine forms of ten to twenty fields each would be a
      // 150-column table for rows that are only ever read one at a time.
      name: 'details',
      type: 'json',
      required: true,
      admin: {
        readOnly: true,
        description: 'The answers, exactly as validated. Field names match the form.',
      },
    },

    {
      name: 'internalNotes',
      type: 'textarea',
      admin: { description: 'Never leaves the CMS.' },
    },

    {
      name: 'meta',
      type: 'group',
      admin: {
        description: 'Captured automatically. Useful when judging whether a request is genuine.',
      },
      fields: [
        {
          name: 'locale',
          type: 'select',
          options: [
            { label: 'العربية', value: 'ar' },
            { label: 'English', value: 'en' },
            { label: '中文', value: 'zh' },
          ],
          admin: { readOnly: true },
        },
        { name: 'sourcePath', type: 'text', admin: { readOnly: true } },
        { name: 'referrer', type: 'text', admin: { readOnly: true } },
        { name: 'userAgent', type: 'text', admin: { readOnly: true } },
        {
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
          'When the notification email was accepted by the provider. Empty means it failed — the request is still safe here.',
      },
    },
    {
      name: 'hubspotSyncedAt',
      label: 'Sent to HubSpot at',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'When the client, deal, note and tasks reached HubSpot. Empty means it failed or HubSpot is not connected — use the button below.',
      },
    },
    {
      name: 'hubspotDealId',
      label: 'HubSpot deal id',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar', description: 'The deal in HubSpot.' },
    },
    {
      name: 'hubspotResend',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/components/admin/HubSpotResend#HubSpotResend' },
      },
    },
  ],
}
