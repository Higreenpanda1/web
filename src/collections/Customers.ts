import { hasRole, isAdmin, isStaff } from '@/access'

import type { CollectionBeforeChangeHook, CollectionConfig, FieldAccess } from 'payload'

/**
 * Client portal accounts (/portal). There is no public sign-up: an account is
 * opened for a client once they have paid (src/lib/portal/auto-accounts.ts),
 * or by the team by hand, so nobody outside the client list can get in.
 *
 * Until 26 October 2026 this was an empty Payload auth collection, kept so the
 * portal would not need a second table. The portal signs clients in without a
 * password (a six-digit code by email, or a one-time link the team sends on
 * WhatsApp), so it is now an ordinary collection and the portal keeps its own
 * signed session cookie (src/lib/portal/tokens.ts). A client can therefore
 * never hold a Payload session, and no access rule has to tell the two apart.
 *
 * A client's requests are found by their email or WhatsApp number, so an
 * account sees everything they sent before it was opened. `role` decides the
 * rest: an owner also sees the requests of every member attached to them.
 */

/** Login secrets: never readable through the API or shown in the admin. */
const secret: FieldAccess = () => false

const normalise: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (typeof data.email === 'string') data.email = data.email.trim().toLowerCase() || null
  if (typeof data.whatsapp === 'string') {
    const digits = data.whatsapp
      .replace(/[٠-٩]/g, (d: string) => String(d.charCodeAt(0) - 0x0660))
      .replace(/\D/g, '')
    data.whatsapp = digits ? `+${digits}` : null
  }
  // Disabling an account, or changing where its codes go, signs it out on
  // every device: the session cookie carries the version it was made with.
  if (
    originalDoc &&
    ((data.disabled === true && !originalDoc.disabled) ||
      (data.email !== undefined && data.email !== originalDoc.email) ||
      (data.whatsapp !== undefined && data.whatsapp !== originalDoc.whatsapp))
  ) {
    data.sessionVersion = (originalDoc.sessionVersion ?? 0) + 1
    data.loginCodeHash = null
    data.loginLinkHash = null
  }
  return data
}

export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Customer account', plural: 'Customer accounts' },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'email', 'whatsapp', 'company', 'role', 'disabled'],
    group: 'Leads',
    description:
      'Client portal accounts (/portal). An account opens by itself within the hour once the client’s HubSpot deal reaches a paid stage (Deposit Paid, or the Nasher 30% deposit), and the client gets a welcome email. The client signs in with a code sent to this email, or with a WhatsApp sign-in link you copy from the account. To shut a client out, tick "Disable account": a deleted account opens again.',
  },
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  hooks: { beforeChange: [normalise] },
  endpoints: [
    {
      // "Copy WhatsApp sign-in link": POST /api/customers/:id/login-link.
      path: '/:id/login-link',
      method: 'post',
      handler: async (req) => {
        if (!hasRole(req.user, 'admin', 'editor')) {
          return Response.json({ ok: false, error: 'Not allowed.' }, { status: 403 })
        }
        // Loaded here, not at the top: the CLI (migrations) reads this file too.
        const { createLoginLink } = await import('@/lib/portal/accounts')
        const result = await createLoginLink(req.payload, Number(req.routeParams?.id))
        return Response.json(result, { status: result.ok ? 200 : 400 })
      },
    },
  ],
  fields: [
    { name: 'fullName', type: 'text', required: true },
    {
      name: 'email',
      type: 'email',
      unique: true,
      index: true,
      admin: { description: 'Sign-in codes are sent here. Leave empty for WhatsApp-only clients.' },
    },
    {
      name: 'whatsapp',
      type: 'text',
      index: true,
      admin: { description: 'With the country code, e.g. +966501234567.' },
    },
    { name: 'company', type: 'text' },
    {
      name: 'country',
      type: 'text',
      admin: { description: 'ISO 3166-1 alpha-2, e.g. SA, YE, AE.' },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'owner',
      options: [
        { label: 'Account owner — sees everything for the company', value: 'owner' },
        { label: 'Member — sees only their own requests', value: 'member' },
      ],
    },
    {
      name: 'owner',
      label: 'Company owner',
      type: 'relationship',
      relationTo: 'customers',
      filterOptions: { role: { equals: 'owner' } },
      admin: {
        condition: (_, sibling) => sibling?.role === 'member',
        description: 'The owner who also sees this member’s requests.',
      },
    },
    {
      name: 'preferredLocale',
      label: 'Language',
      type: 'select',
      defaultValue: 'ar',
      options: [
        { label: 'العربية', value: 'ar' },
        { label: 'English', value: 'en' },
      ],
    },
    {
      name: 'disabled',
      label: 'Disable account',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Signs the client out at once and stops them signing in.',
      },
    },
    {
      name: 'loginLink',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/components/admin/PortalLoginLink#PortalLoginLink' },
      },
    },
    {
      name: 'lastLoginAt',
      label: 'Last sign-in',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Internal. Never shown to the client.' },
    },

    // Sign-in state. Hashes only; never read through the API.
    {
      name: 'sessionVersion',
      type: 'number',
      defaultValue: 0,
      access: { read: secret },
      admin: { hidden: true },
    },
    { name: 'loginCodeHash', type: 'text', access: { read: secret }, admin: { hidden: true } },
    { name: 'loginCodeExpiresAt', type: 'date', access: { read: secret }, admin: { hidden: true } },
    {
      name: 'loginCodeAttempts',
      type: 'number',
      defaultValue: 0,
      access: { read: secret },
      admin: { hidden: true },
    },
    {
      name: 'loginLinkHash',
      type: 'text',
      index: true,
      access: { read: secret },
      admin: { hidden: true },
    },
    { name: 'loginLinkExpiresAt', type: 'date', access: { read: secret }, admin: { hidden: true } },
  ],
}
