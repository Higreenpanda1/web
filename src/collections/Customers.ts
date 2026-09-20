import { isAdmin, isStaff, isStaffField } from '@/access'

import type { CollectionConfig } from 'payload'

/**
 * Portal accounts. NOT BUILT YET — there are no /portal routes in this release.
 *
 * The collection exists now because the build prompt asks for the phase-2
 * client portal not to be blocked, and an auth collection is the one thing that
 * cannot be retrofitted cheaply: merging customers into `users` later would
 * mean rewriting every access rule, every session and the admin permission
 * model at once. Keeping them apart from day one costs one empty table.
 *
 * `role` is here for the same reason — a company owner who can see every order
 * for their company, versus a staff member of that company who can see only
 * their own, is a distinction the portal will need on its first day.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Customer account', plural: 'Customer accounts' },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 8,
    lockTime: 10 * 60 * 1000,
    depth: 0,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'fullName', 'company', 'role', 'createdAt'],
    group: 'Administration',
    description:
      'Phase 2 — the client portal. No public sign-up or login route exists yet; these records are here so the schema does not have to change when it does.',
  },
  access: {
    read: isStaff,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    // Customers never reach the CMS admin panel, whatever their role.
    admin: () => false,
  },
  fields: [
    { name: 'fullName', type: 'text', required: true },
    { name: 'company', type: 'text' },
    {
      name: 'country',
      type: 'text',
      admin: { description: 'ISO 3166-1 alpha-2, e.g. SA, YE, AE.' },
    },
    { name: 'whatsapp', type: 'text' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'owner',
      options: [
        { label: 'Account owner — sees everything for the company', value: 'owner' },
        { label: 'Member — sees only their own orders', value: 'member' },
      ],
    },
    {
      name: 'preferredLocale',
      type: 'select',
      defaultValue: 'ar',
      options: [
        { label: 'العربية', value: 'ar' },
        { label: 'English', value: 'en' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      access: { read: isStaffField },
      admin: { description: 'Internal. Never shown to the customer.' },
    },
  ],
}
