import path from 'node:path'

import { anyone, isStaff } from '@/access'

import type { CollectionConfig } from 'payload'

/**
 * Where uploads live on disk.
 *
 * Resolved from the working directory rather than from this module's own path:
 * once the app is bundled for production the module no longer sits two levels
 * below the project root, and a relative path computed from `import.meta.url`
 * quietly points somewhere else. In Docker this is /app/media, which is a
 * mounted volume so a redeploy never loses it.
 */
const MEDIA_DIR = process.env.MEDIA_DIR ?? path.resolve(process.cwd(), 'media')

/**
 * Uploads are validated by type and by size, and written outside the web root
 * to a directory Caddy never serves directly — everything goes through
 * /api/media/file/*, which sets its own content type. That is what stops a
 * .php or .svg upload ever being executed or run as script, which is how the
 * previous site was taken over (brief section 8).
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
] as const

const MAX_BYTES = 8 * 1024 * 1024

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'File', plural: 'Media' },
  admin: {
    group: 'Content',
    description: 'JPEG, PNG, WebP, AVIF or PDF. Maximum 8 MB. SVG is not accepted.',
  },
  access: {
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  upload: {
    staticDir: MEDIA_DIR,
    // SVG is excluded on purpose: it is an executable document, and an upload
    // form that accepts it is a stored-XSS hole. Brand SVGs ship in /public.
    mimeTypes: [...ALLOWED_MIME_TYPES],
    formatOptions: {
      format: 'webp',
      options: { quality: 82 },
    },
    imageSizes: [
      { name: 'thumbnail', width: 320, height: 320, position: 'centre' },
      { name: 'card', width: 768 },
      { name: 'feature', width: 1280 },
      { name: 'hero', width: 1920 },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    crop: true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      localized: true,
      required: true,
      admin: {
        description:
          'What the image shows, for screen readers and for when it fails to load. Write it in the language you are editing. Leave a single space for purely decorative images.',
      },
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
    },
    {
      name: 'credit',
      type: 'text',
      admin: { description: 'Photographer or source, if one needs crediting.' },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ req, data }) => {
        const file = req.file
        if (!file) return data
        if (file.size > MAX_BYTES) {
          throw new Error(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 8 MB.`)
        }
        if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
          throw new Error(`${file.mimetype} is not an accepted file type.`)
        }
        return data
      },
    ],
  },
}
