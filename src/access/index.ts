import type { Access, FieldAccess } from 'payload'

import type { User } from '@/payload-types'

/**
 * Access control for the CMS.
 *
 * Two auth collections exist from day one (see src/collections/Users.ts and
 * Customers.ts): staff who run the site, and customers who will log into the
 * client portal in phase 2. They are deliberately separate tables rather than
 * one table with a role flag, because the portal will need different fields,
 * different sessions and different rate limits, and merging them later would
 * be a migration rewrite. Every check below therefore asserts the collection a
 * user came from, not just its role.
 */

type StaffRole = NonNullable<User['role']>

const STAFF_COLLECTION = 'users'

function staff(user: unknown): User | null {
  if (!user || typeof user !== 'object') return null
  const candidate = user as Partial<User> & { collection?: string }
  if (candidate.collection !== STAFF_COLLECTION) return null
  return candidate as User
}

function hasRole(user: unknown, ...roles: StaffRole[]): boolean {
  const member = staff(user)
  if (!member) return false
  return roles.includes(member.role ?? 'editor')
}

/** Anyone, signed in or not. Used for published public content. */
export const anyone: Access = () => true

/** Any signed-in staff member (admin or editor). */
export const isStaff: Access = ({ req }) => hasRole(req.user, 'admin', 'editor')

/** Administrators only — user management, redirects, settings, destructive ops. */
export const isAdmin: Access = ({ req }) => hasRole(req.user, 'admin')

export const isAdminField: FieldAccess = ({ req }) => hasRole(req.user, 'admin')

/** Field-level equivalent of isStaff. Field access has a different signature
 *  from document access, so the two cannot share one function. */
export const isStaffField: FieldAccess = ({ req }) => hasRole(req.user, 'admin', 'editor')

/** Staff may read everything; the public may read only published documents. */
export const isStaffOrPublished: Access = ({ req }) => {
  if (hasRole(req.user, 'admin', 'editor')) return true
  return {
    _status: { equals: 'published' },
  }
}

/** An administrator, or the staff member themself. Used on the Users collection. */
export const isAdminOrSelf: Access = ({ req }) => {
  if (hasRole(req.user, 'admin')) return true
  const member = staff(req.user)
  if (!member) return false
  return { id: { equals: member.id } }
}

/**
 * Nobody, through the API. Enquiries are created by the server action in
 * src/app/actions/enquiry.ts using Payload's local API, which bypasses access
 * control on purpose — so the REST endpoint stays shut and the form is the
 * only way in.
 */
export const noone: Access = () => false

export { hasRole, staff }
