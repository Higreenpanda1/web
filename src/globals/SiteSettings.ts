import { anyone, isStaff } from '@/access'
import { revalidateGlobal } from '@/lib/revalidate'

import type { GlobalConfig } from 'payload'

/**
 * Everything the client should be able to change without a deploy: the
 * navigation, the footer, the contact details, the social links, and above all
 * the WhatsApp number — the build prompt makes that configurable here for a
 * reason, because it is the single most load-bearing piece of contact
 * information on the site.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  hooks: revalidateGlobal('settings'),
  label: 'Site settings',
  admin: {
    group: 'Administration',
    description: 'Navigation, contact details and social links. Changes go live immediately.',
  },
  access: {
    read: anyone,
    update: isStaff,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contact',
          fields: [
            {
              name: 'whatsappNumber',
              type: 'text',
              required: true,
              defaultValue: '+8613023440305',
              admin: {
                description:
                  'E.164 with the plus, e.g. +8613023440305. Powers the floating WhatsApp button on every page.',
              },
              validate: (value: unknown) => {
                if (typeof value !== 'string') return 'A WhatsApp number is required.'
                if (!/^\+[1-9]\d{6,14}$/.test(value.replace(/[\s-]/g, ''))) {
                  return 'Use the international format with a plus, e.g. +8613023440305.'
                }
                return true
              },
            },
            {
              name: 'whatsappPrefill',
              type: 'text',
              localized: true,
              admin: {
                description:
                  'Optional message pre-filled when someone taps the button, in the language of the page they were on.',
              },
            },
            {
              name: 'email',
              type: 'email',
              required: true,
              defaultValue: 'contact@higreenpanda.com',
            },
            { name: 'secondaryEmail', type: 'email' },
            { name: 'phone', type: 'text' },
            {
              name: 'offices',
              type: 'array',
              localized: true,
              labels: { singular: 'Office', plural: 'Offices' },
              fields: [
                { name: 'city', type: 'text', required: true },
                { name: 'address', type: 'textarea' },
              ],
            },
            {
              name: 'workingHours',
              type: 'text',
              localized: true,
              admin: { description: 'e.g. Sunday–Thursday, 09:00–18:00 China time.' },
            },
          ],
        },
        {
          label: 'Navigation',
          fields: [
            {
              name: 'primaryNav',
              type: 'array',
              labels: { singular: 'Link', plural: 'Primary navigation' },
              maxRows: 7,
              fields: [
                { name: 'label', type: 'text', required: true, localized: true },
                { name: 'href', type: 'text', required: true },
              ],
            },
            {
              name: 'footerColumns',
              type: 'array',
              maxRows: 3,
              labels: { singular: 'Column', plural: 'Footer columns' },
              fields: [
                { name: 'title', type: 'text', required: true, localized: true },
                {
                  name: 'links',
                  type: 'array',
                  fields: [
                    { name: 'label', type: 'text', required: true, localized: true },
                    { name: 'href', type: 'text', required: true },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Social',
          fields: [
            {
              name: 'social',
              type: 'group',
              fields: [
                { name: 'instagram', type: 'text', defaultValue: 'https://instagram.com/higreenpanda' },
                { name: 'youtube', type: 'text', defaultValue: 'https://youtube.com/@Higreenpanda' },
                { name: 'facebook', type: 'text' },
                { name: 'tiktok', type: 'text' },
                { name: 'linkedin', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Identity',
          fields: [
            {
              name: 'organisationName',
              type: 'text',
              localized: true,
              required: true,
              defaultValue: 'HiGreen Panda Marketing',
              admin: { description: 'Used in the Organization structured data.' },
            },
            {
              name: 'tagline',
              type: 'text',
              localized: true,
              admin: { description: 'One line. Shown in link previews and search results.' },
            },
            {
              name: 'defaultOgImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Falls back to the brand OG image in /brand/social if left empty. 1200 × 630.',
              },
            },
          ],
        },
        {
          label: 'Legal',
          fields: [
            {
              name: 'legalUpdatedAt',
              type: 'date',
              admin: { description: 'Shown as “last updated” on the privacy and terms pages.' },
            },
            {
              name: 'companyRegistration',
              type: 'text',
              admin: { description: 'Shown in the footer if filled in.' },
            },
          ],
        },
      ],
    },
  ],
}
