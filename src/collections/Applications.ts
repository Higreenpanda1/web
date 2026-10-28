import { hasRole, isAdmin, isStaff, noone } from '@/access'
import { INVOICE_STAGES, type BillingItem, type InvoiceStage } from '@/lib/billing'
import { APPLICATION_TYPES } from '@/lib/catalogue'
import { PRICE_LIST, priceListItem } from '@/lib/price-list'
import {
  draftItems,
  orderProducts,
  orderTotal,
  ORDER_CURRENCIES,
  ORDER_UNITS,
  type OrderItem,
} from '@/lib/product-order'

import type { Application } from '@/payload-types'
import type { CollectionBeforeChangeHook, CollectionConfig, PayloadRequest } from 'payload'

const isProductRequest = (data: Partial<Application> | undefined) => data?.type === 'product-search'

/** HiGP services: every request that is not for products or shipping (those are Nasher's). */
const isServiceRequest = (data: Partial<Application> | undefined) =>
  !!data?.type && data.type !== 'product-search' && data.type !== 'shipping-quote'

/**
 * A service line takes the list price when the team leaves the price empty,
 * so the saved quote shows what was charged even if the list changes later.
 */
const fillListPrices: CollectionBeforeChangeHook<Application> = ({ data }) => {
  const items = data.billing?.items as BillingItem[] | undefined
  if (!items?.length) return data
  return {
    ...data,
    billing: {
      ...data.billing,
      items: items.map((item) => ({
        ...item,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? priceListItem(item.service)?.price ?? null,
      })),
    },
  } as typeof data
}

/**
 * A product request gets its price lines drafted from what the client asked
 * for, the first time it is saved without any (on arrival, and for requests
 * from before this existed, on the first save in the admin). The total is
 * kept in step with the lines on every save.
 */
const draftOrder: CollectionBeforeChangeHook<Application> = ({ data, originalDoc }) => {
  const type = data.type ?? originalDoc?.type
  if (type !== 'product-search') return data
  const items = (data.order?.items ?? originalDoc?.order?.items ?? []) as OrderItem[]
  if (items.length === 0) {
    const reference = data.reference ?? originalDoc?.reference ?? ''
    const drafted = draftItems(orderProducts(data.details ?? originalDoc?.details, reference))
    if (drafted.length === 0) return data
    return {
      ...data,
      order: { ...originalDoc?.order, ...data.order, items: drafted, total: null },
    }
  }
  if (!data.order?.items) return data
  return { ...data, order: { ...data.order, total: orderTotal(data.order.items as OrderItem[]) } }
}

/** The request, for a signed-in staff member; a Response when it cannot be had. */
async function staffApplication(req: PayloadRequest): Promise<Application | Response> {
  if (!hasRole(req.user, 'admin', 'editor')) {
    return Response.json({ error: 'Not allowed.' }, { status: 403 })
  }
  const id = Number(req.routeParams?.id)
  const application = Number.isInteger(id)
    ? await req.payload
        .findByID({ collection: 'applications', id, depth: 0, req })
        .catch(() => null)
    : null
  return application ?? Response.json({ error: 'Not found.' }, { status: 404 })
}

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
  hooks: { beforeChange: [draftOrder, fillListPrices] },
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
    {
      // A product photo, for the admin and the printable brief. The files sit
      // in a private folder no other route serves; this hands them only to
      // staff, and only the photos of this request.
      path: '/:id/photo/:file',
      method: 'get',
      handler: async (req) => {
        const application = await staffApplication(req)
        if (application instanceof Response) return application
        // Loaded here, not at the top: the CLI (migrations) reads this file too.
        const { readOrderPhoto } = await import('@/lib/order-files')
        const photo = await readOrderPhoto(
          application.reference,
          application.createdAt,
          String(req.routeParams?.file ?? ''),
        )
        if (!photo) return Response.json({ error: 'Not found.' }, { status: 404 })
        return new Response(photo.content as BodyInit, {
          headers: {
            'Content-Type': photo.mime,
            'Cache-Control': 'private, max-age=3600',
            'Content-Disposition': 'inline',
          },
        })
      },
    },
    {
      // An Excel or PDF file sent with a product, under the same rules as
      // the photos. Downloaded, never shown in the page.
      path: '/:id/file/:file',
      method: 'get',
      handler: async (req) => {
        const application = await staffApplication(req)
        if (application instanceof Response) return application
        // Loaded here, not at the top: the CLI (migrations) reads this file too.
        const { readOrderFile } = await import('@/lib/order-files')
        const name = String(req.routeParams?.file ?? '')
        const file = await readOrderFile(application.reference, application.createdAt, name)
        if (!file) return Response.json({ error: 'Not found.' }, { status: 404 })
        return new Response(file.content as BodyInit, {
          headers: {
            'Content-Type': file.mime,
            'Cache-Control': 'private, max-age=3600',
            'Content-Disposition': `attachment; filename="${name}"`,
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
    },
    {
      // The printable brief: /api/applications/:id/brief, or ?for=factory
      // for the version without the client's details and our prices.
      path: '/:id/brief',
      method: 'get',
      handler: async (req) => {
        const application = await staffApplication(req)
        if (application instanceof Response) return application
        if (!isProductRequest(application)) {
          return Response.json({ error: 'Only product requests have a brief.' }, { status: 400 })
        }
        const { renderBrief } = await import('@/lib/order-brief')
        const api = req.payload.config.routes.api
        const html = renderBrief(
          application,
          req.searchParams?.get('for') === 'factory' ? 'factory' : 'team',
          {
            photoUrl: (file) =>
              `${api}/applications/${application.id}/photo/${encodeURIComponent(file)}`,
            fileUrl: (file) =>
              `${api}/applications/${application.id}/file/${encodeURIComponent(file)}`,
            nonce: req.headers.get('x-nonce'),
          },
        )
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        })
      },
    },
    {
      // The Nasher proforma invoice of a product order, from "Order and prices".
      path: '/:id/proforma',
      method: 'get',
      handler: async (req) => {
        const application = await staffApplication(req)
        if (application instanceof Response) return application
        if (!isProductRequest(application)) {
          return Response.json(
            { error: 'Only product requests have a proforma invoice.' },
            { status: 400 },
          )
        }
        const { renderProforma } = await import('@/lib/proforma-document')
        const details = (application.details ?? {}) as Record<string, unknown>
        const text = (value: unknown) => (typeof value === 'string' && value.trim()) || null
        const html = renderProforma({
          reference: application.reference,
          date: new Date().toISOString().slice(0, 10),
          currency: application.order?.currency ?? 'usd',
          terms: application.order?.paymentTerms,
          items: (application.order?.items ?? []) as OrderItem[],
          buyer: {
            name: application.name,
            company: text(details.companyName),
            address: text(details.companyAddress),
            country: application.country,
            whatsapp: application.whatsapp,
            email: application.email,
          },
          destination: text(details.destinationCountry),
          nonce: req.headers.get('x-nonce'),
        })
        if (!html) {
          return Response.json(
            {
              error:
                'Enter a quantity and a unit price for every product under "Order and prices" and save first.',
            },
            { status: 400 },
          )
        }
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        })
      },
    },
    {
      // The printable quote and invoices of a HiGP service request:
      // /api/applications/:id/document, or ?kind=invoice&stage=deposit|balance|full.
      path: '/:id/document',
      method: 'get',
      handler: async (req) => {
        const application = await staffApplication(req)
        if (application instanceof Response) return application
        if (!isServiceRequest(application)) {
          return Response.json({ error: 'Only service requests have a quote.' }, { status: 400 })
        }
        const { billLines } = await import('@/lib/billing')
        const lines = billLines((application.billing?.items ?? []) as BillingItem[])
        if (lines.length === 0) {
          return Response.json(
            { error: 'Add the services under "Quote and invoice" and save first.' },
            { status: 400 },
          )
        }
        const kind = req.searchParams?.get('kind') === 'invoice' ? 'invoice' : 'quote'
        const asked = req.searchParams?.get('stage') ?? ''
        const stage: InvoiceStage = (INVOICE_STAGES as readonly string[]).includes(asked)
          ? (asked as InvoiceStage)
          : 'deposit'
        const paidOn = {
          deposit: application.billing?.paidDeposit,
          balance: application.billing?.paidBalance,
          full: application.billing?.paidFull,
        }[stage]
        const { renderBillingDocument, HIGP } = await import('@/lib/billing-document')
        const details = (application.details ?? {}) as Record<string, unknown>
        const html = renderBillingDocument({
          issuer: HIGP,
          kind,
          stage,
          reference: application.reference,
          date: new Date().toISOString().slice(0, 10),
          client: {
            name: application.name,
            company:
              application.billing?.clientCompany ||
              (typeof details.companyName === 'string' ? details.companyName : null),
            country: application.country,
            whatsapp: application.whatsapp,
            email: application.email,
          },
          lines,
          paidOn: kind === 'invoice' ? (paidOn?.slice(0, 10) ?? null) : null,
          nonce: req.headers.get('x-nonce'),
        })
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        })
      },
    },
    {
      // The business relationship letter for the client's bank:
      // /api/applications/:id/relationship, or ?from=higp|nasher to pick the
      // company the client is paying (by default Nasher for goods, HiGP otherwise).
      path: '/:id/relationship',
      method: 'get',
      handler: async (req) => {
        const application = await staffApplication(req)
        if (application instanceof Response) return application
        const { clientHistory, isGoods, requestAmount } = await import('@/lib/client-history')
        const { HIGP, NASHER } = await import('@/lib/billing-document')
        const { renderRelationshipLetter } = await import('@/lib/relationship-letter')
        // A loose match by the last digits, then an exact one on all digits.
        const tail = application.whatsapp.replace(/\D/g, '').slice(-8)
        const { docs } = await req.payload.find({
          collection: 'applications',
          where: { whatsapp: { contains: tail } },
          depth: 0,
          limit: 500,
          pagination: false,
          req,
        })
        const history = clientHistory(application, docs)
        const from = req.searchParams?.get('from')
        const goods = from ? from === 'nasher' : isGoods(application.type)
        const details = (application.details ?? {}) as Record<string, unknown>
        const html = renderRelationshipLetter({
          issuer: goods ? NASHER : HIGP,
          purpose: goods
            ? { en: 'purchase of goods', zh: '采购货物' }
            : { en: 'business services in China', zh: '在华商务服务' },
          reference: application.reference,
          date: new Date().toISOString().slice(0, 10),
          client: {
            name: application.name,
            company:
              application.billing?.clientCompany ||
              (typeof details.companyName === 'string' ? details.companyName : null),
            country: application.country,
            whatsapp: application.whatsapp,
          },
          history,
          current: { reference: application.reference, amount: requestAmount(application) },
          nonce: req.headers.get('x-nonce'),
        })
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        })
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
      // The products with their photos and the print buttons; the raw
      // answers stay below for anything this does not show.
      name: 'productOrder',
      type: 'ui',
      admin: {
        condition: isProductRequest,
        components: { Field: '@/components/admin/ProductOrder#ProductOrder' },
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
      // What we charge, product by product. The Nasher proforma invoice and
      // the client's order history read these, so they are real columns,
      // not more JSON.
      name: 'order',
      label: 'Order and prices',
      type: 'group',
      admin: {
        condition: isProductRequest,
        description:
          'Filled from the request when it arrives. Enter the final unit price for each product; change the quantity or wording if the factory changed them.',
      },
      fields: [
        {
          name: 'currency',
          type: 'select',
          required: true,
          defaultValue: 'usd',
          options: ORDER_CURRENCIES.map((value) => ({ label: value.toUpperCase(), value })),
        },
        {
          // As agreed with this client; printed on the proforma invoice.
          name: 'paymentTerms',
          label: 'Payment terms',
          type: 'select',
          required: true,
          defaultValue: 'full',
          options: [
            { label: 'Full payment', value: 'full' },
            { label: '50% deposit, 50% before shipment', value: '50-50' },
            { label: '30% deposit, 70% before shipment', value: '30-70' },
          ],
        },
        {
          name: 'items',
          label: 'Products',
          labels: { singular: 'Product', plural: 'Products' },
          type: 'array',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'productName',
                  label: 'Product',
                  type: 'text',
                  required: true,
                  admin: { width: '40%' },
                },
                { name: 'quantity', type: 'number', min: 0, admin: { width: '20%' } },
                {
                  name: 'unit',
                  type: 'select',
                  defaultValue: 'pieces',
                  options: ORDER_UNITS.map((value) => ({
                    label: value[0]!.toUpperCase() + value.slice(1),
                    value,
                  })),
                  admin: { width: '20%' },
                },
                {
                  name: 'unitPrice',
                  label: 'Unit price',
                  type: 'number',
                  min: 0,
                  admin: { width: '20%', step: 0.01 },
                },
              ],
            },
            {
              name: 'description',
              type: 'textarea',
              admin: {
                rows: 2,
                description: 'Sizes, colours, material — as the invoice should say it.',
              },
            },
            {
              // Which product of the request this line came from, for its photos.
              name: 'position',
              type: 'number',
              admin: { hidden: true },
            },
          ],
        },
        {
          name: 'total',
          type: 'number',
          admin: {
            readOnly: true,
            description:
              'Quantity × unit price, all products. Filled on save once every product has a price.',
          },
        },
      ],
    },

    {
      // The business relationship letter for the client's bank, on every request.
      name: 'relationshipLetter',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/components/admin/RelationshipLetter#RelationshipLetter' },
      },
    },
    {
      // The quote and invoice buttons for a HiGP service request.
      name: 'billingDocuments',
      type: 'ui',
      admin: {
        condition: isServiceRequest,
        components: { Field: '@/components/admin/BillingDocuments#BillingDocuments' },
      },
    },
    {
      // What HiGP charges for this request, line by line, from the price
      // list. The quote and the invoices are printed from these.
      name: 'billing',
      label: 'Quote and invoice',
      type: 'group',
      admin: {
        condition: isServiceRequest,
        description:
          'Pick the services from the price list. Leave the price empty for the list price, or type another for a special client. Save, then use the buttons above.',
      },
      fields: [
        {
          name: 'clientCompany',
          label: 'Client company on the quote',
          type: 'text',
          admin: { description: 'Leave empty to use the company name from the request, if any.' },
        },
        {
          name: 'items',
          label: 'Services',
          labels: { singular: 'Service', plural: 'Services' },
          type: 'array',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'service',
                  type: 'select',
                  required: true,
                  options: [
                    ...PRICE_LIST.map((entry) => ({
                      label: `${entry.en} — ¥${entry.price.toLocaleString('en-US')}${entry.yearly ? ' / year' : ''}`,
                      value: entry.sku,
                    })),
                    { label: 'Other (type the name below)', value: 'other' },
                  ],
                  admin: { width: '50%' },
                },
                {
                  name: 'quantity',
                  type: 'number',
                  min: 1,
                  defaultValue: 1,
                  admin: { width: '20%' },
                },
                {
                  name: 'unitPrice',
                  label: 'Unit price (CNY)',
                  type: 'number',
                  min: 0,
                  admin: { width: '30%', description: 'Empty = list price.' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'name',
                  label: 'Name in English',
                  type: 'text',
                  admin: { width: '50%', description: 'Only for "Other", or to rename a service.' },
                },
                { name: 'nameZh', label: 'Name in Chinese', type: 'text', admin: { width: '50%' } },
              ],
            },
            { name: 'description', type: 'textarea', admin: { rows: 2 } },
          ],
        },
        {
          // A date here prints the green PAID stamp on that invoice.
          type: 'row',
          fields: [
            {
              name: 'paidDeposit',
              label: '50% deposit paid on',
              type: 'date',
              admin: { width: '33%' },
            },
            {
              name: 'paidBalance',
              label: 'Balance paid on',
              type: 'date',
              admin: { width: '33%' },
            },
            {
              name: 'paidFull',
              label: 'Full amount paid on',
              type: 'date',
              admin: { width: '34%' },
            },
          ],
        },
      ],
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
