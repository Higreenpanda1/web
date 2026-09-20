import { Forbidden } from 'payload'

import { isAdmin, isAdminField, isAdminOrSelf } from '@/access'
import { verifyBackupCode } from '@/lib/backup-codes'

import type { CollectionConfig } from 'payload'

/**
 * Staff who run the site. Deliberately separate from `Customers`, which is the
 * auth collection the client portal will use in phase 2 — see that file for
 * why the two are not one table with a role flag.
 *
 * Two-factor authentication is enforced here rather than in the admin UI. The
 * `beforeLogin` hook below refuses any login that has not already passed a TOTP
 * check, which means the REST endpoint `/api/users/login` is closed to a
 * password-only attacker as well as the admin screen. The check itself happens
 * in the sign-in gate at /hgp-studio-gate, which sets `twoFactorVerified` on
 * the request context before calling `payload.login`.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Staff user', plural: 'Staff' },
  auth: {
    tokenExpiration: 60 * 60 * 8, // 8 hours — a working day, then sign in again.
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    useAPIKey: false,
    depth: 0,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'totpEnabled'],
    group: 'Administration',
  },
  access: {
    read: isAdminOrSelf,
    create: isAdmin,
    update: isAdminOrSelf,
    delete: isAdmin,
    admin: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Administrator — everything, including users and redirects', value: 'admin' },
        { label: 'Editor — content only', value: 'editor' },
      ],
      access: {
        // An editor must not be able to promote themselves.
        create: isAdminField,
        update: isAdminField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'totpEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Enrol with: npm run totp:enrol -- <email>',
      },
    },
    {
      // Never exposed through the API or the admin UI; read directly from the
      // database by the sign-in gate.
      name: 'totpSecret',
      type: 'text',
      hidden: true,
      access: {
        read: () => false,
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'backupCodes',
      type: 'array',
      hidden: true,
      access: {
        read: () => false,
        create: () => false,
        update: () => false,
      },
      fields: [
        { name: 'hash', type: 'text', required: true },
        { name: 'usedAt', type: 'date' },
      ],
    },
  ],
  hooks: {
    beforeLogin: [
      ({ req }) => {
        if (process.env.ADMIN_REQUIRE_2FA !== 'true') return
        if (req.context?.twoFactorVerified === true) return
        // Payload's Forbidden, not a bare Error: a bare one surfaces as a 500,
        // which reads like a broken server rather than a refused request.
        // Deliberately vague otherwise — an attacker learns nothing about
        // whether the password was right, only that this is not the way in.
        throw new Forbidden(req.t)
      },
    ],
  },
}

/** Shared by the gate: consume a single-use backup code, returning its index. */
export function findUnusedBackupCode(
  code: string,
  stored: Array<{ hash: string; usedAt?: string | null }> | null | undefined,
): number {
  if (!stored) return -1
  return stored.findIndex((entry) => !entry.usedAt && verifyBackupCode(code, entry.hash))
}
