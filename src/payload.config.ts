import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Categories } from '@/collections/Categories'
import { Customers } from '@/collections/Customers'
import { Enquiries } from '@/collections/Enquiries'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Posts } from '@/collections/Posts'
import { Redirects } from '@/collections/Redirects'
import { Services } from '@/collections/Services'
import { TeamMembers } from '@/collections/TeamMembers'
import { Testimonials } from '@/collections/Testimonials'
import { Users } from '@/collections/Users'
import { SiteSettings } from '@/globals/SiteSettings'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * The admin panel does not live at /admin. A guessable admin path is free
 * reconnaissance for anyone scanning, and the brief asks for it explicitly.
 *
 * This value and the directory src/app/(payload)/hgp-studio/ must match: Next's
 * file routing decides the URL, and Payload only needs to be told what it is.
 * Changing the path means renaming the directory too — see DEPLOY.md.
 */
const ADMIN_ROUTE = '/hgp-studio'

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

export default buildConfig({
  serverURL,

  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    // Not gravatar: Payload's default sends an MD5 of the signed-in user's
    // email address to a third party on every admin page load, which is both a
    // privacy leak and a request the site's own CSP correctly refuses.
    avatar: 'default',
    meta: {
      titleSuffix: ' · HiGreenPanda',
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/favicon.svg' }],
    },
    components: {
      // Explains the 2FA gate on the stock login screen, for anyone who
      // arrives there directly.
      beforeLogin: ['@/components/admin/LoginNotice#LoginNotice'],
    },
    livePreview: {
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 390, height: 844 },
        { label: 'Tablet', name: 'tablet', width: 834, height: 1112 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },

  routes: {
    admin: ADMIN_ROUTE,
  },

  /**
   * Arabic first. Payload's built-in localisation means one document carries
   * both languages — not two parallel trees, which is what the build prompt
   * rules out and what makes translations drift in practice.
   *
   * `fallback: true` means an untranslated English field falls back to the
   * Arabic value rather than rendering empty. For this business that is the
   * right failure mode: an Arabic sentence on an English page is recoverable,
   * a blank page is not.
   */
  localization: {
    locales: [
      { label: 'العربية', code: 'ar', rtl: true },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'ar',
    fallback: true,
  },

  collections: [
    Pages,
    Services,
    Posts,
    Categories,
    Testimonials,
    TeamMembers,
    Media,
    Enquiries,
    Redirects,
    Users,
    Customers,
  ],

  globals: [SiteSettings],

  editor: lexicalEditor(),

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI ?? '',
      max: 10,
    },
    // Schema changes are applied through checked-in migrations in production,
    // never by letting the app alter its own tables at boot. `push` stays on in
    // development so iterating on a collection does not need a migration each
    // time.
    push: process.env.NODE_ENV !== 'production',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),

  /**
   * Transactional email. Form notifications must not depend on the domain's own
   * mail server — the last DNS wipe took the MX records with it and enquiries
   * were lost (brief section 6). Without a key the adapter is omitted entirely
   * and enquiries are still stored; see src/lib/email.ts.
   */
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS ?? 'website@higreenpanda.com',
        defaultFromName: process.env.EMAIL_FROM_NAME ?? 'HiGreenPanda',
        apiKey: process.env.RESEND_API_KEY,
      })
    : undefined,

  sharp,

  secret: process.env.PAYLOAD_SECRET ?? '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  graphQL: {
    // The site is rendered on the server with the local API; nothing needs a
    // public GraphQL endpoint, and leaving one open is free schema disclosure.
    disable: true,
  },

  // Payload 3 has no built-in rate limiter (v2's `rateLimit` option is gone),
  // so it is applied in src/middleware.ts instead, where it also covers the
  // sign-in gate and the REST API. Caddy adds an optional IP gate on top.

  cors: [serverURL],
  csrf: [serverURL],

  upload: {
    limits: { fileSize: 8 * 1024 * 1024 },
  },
})
