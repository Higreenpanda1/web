import { anyone, isAdmin, isStaff } from '@/access'
import { revalidateCollection } from '@/lib/revalidate'

import type { CollectionConfig } from 'payload'

/**
 * 301s for the old site's URLs, plus 410s for the spam pages that were injected
 * into it (brief section 8). Both are editable by the client, because the list
 * of spam URLs Google still holds will keep growing as Search Console reports
 * them, and each one should not need a deploy.
 *
 * A 410 rather than a 404 for the injected pages: Google drops a 410 far faster
 * than a 404, and speed is the point — those URLs are still in the index.
 */
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  // Publishing drops this collection's cache tag so the change is live at once.
  hooks: revalidateCollection('redirects'),
  labels: { singular: 'Redirect', plural: 'Redirects' },
  admin: {
    useAsTitle: 'from',
    defaultColumns: ['from', 'type', 'to', 'enabled'],
    group: 'Administration',
    description:
      'Old URLs that should send visitors somewhere new, and injected spam URLs that should be told they are gone for good.',
  },
  access: {
    // Read is public because middleware resolves redirects on every request
    // through the local API; nothing sensitive lives here.
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: 'from',
  fields: [
    {
      name: 'from',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          'Path only, starting with a slash, no domain. e.g. /en/home/ — matched with and without the trailing slash.',
      },
      validate: (value: unknown) => {
        if (typeof value !== 'string' || !value.startsWith('/')) {
          return 'Start with a slash, e.g. /en/home/'
        }
        if (value.includes('://')) return 'Path only — no https:// and no domain.'
        return true
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: '301',
      options: [
        { label: '301 — moved permanently, send them to the new page', value: '301' },
        { label: '308 — moved permanently, keep the request method', value: '308' },
        { label: '302 — temporary', value: '302' },
        { label: '410 — gone for good (use for injected spam URLs)', value: '410' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'to',
      type: 'text',
      admin: {
        description: 'Where to send them. Leave empty for a 410.',
        condition: (data) => data?.type !== '410',
      },
      validate: (value: unknown, { siblingData }: { siblingData: unknown }) => {
        const type = (siblingData as { type?: string } | undefined)?.type
        if (type === '410') return true
        if (typeof value !== 'string' || value.length === 0) {
          return 'A destination is required for anything other than a 410.'
        }
        if (!value.startsWith('/') && !value.startsWith('https://')) {
          return 'Use a path starting with a slash, or a full https:// URL.'
        }
        // A rule pointing at its own source is an infinite redirect loop, and
        // the browser, not the CMS, is where it would be discovered.
        const from = (siblingData as { from?: string } | undefined)?.from
        if (from && normalisePath(from) === normalisePath(value)) {
          return 'The destination is the same as the source — that is a redirect loop.'
        }
        return true
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'note',
      type: 'text',
      admin: { description: 'Why this exists. Future you will want to know.' },
    },
    {
      name: 'hits',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'How often this rule has fired. A rule at zero after a year can go.',
      },
    },
  ],
}

/** Trailing slashes are not a difference; /en/home and /en/home/ are one path. */
function normalisePath(value: string): string {
  return value.replace(/\/+$/, '') || '/'
}
