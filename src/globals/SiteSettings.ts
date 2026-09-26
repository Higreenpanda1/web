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
              /**
               * The array itself is localised, not just the labels inside it.
               *
               * With a non-localised array holding localised fields, Payload
               * keys each translation to a row id — so writing the English
               * version replaces the rows and the Arabic labels are orphaned,
               * leaving a menu of blank links. Localising the array gives each
               * language its own rows, which is also what an editor wants: the
               * Arabic and English menus are allowed to differ.
               */
              name: 'primaryNav',
              type: 'array',
              localized: true,
              labels: { singular: 'Link', plural: 'Primary navigation' },
              maxRows: 7,
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'href', type: 'text', required: true },
              ],
            },
            {
              name: 'footerColumns',
              type: 'array',
              localized: true,
              maxRows: 3,
              labels: { singular: 'Column', plural: 'Footer columns' },
              fields: [
                { name: 'title', type: 'text', required: true },
                {
                  name: 'links',
                  type: 'array',
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    { name: 'href', type: 'text', required: true },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Licences',
          fields: [
            {
              /**
               * The registered companies behind the brand, shown on the About
               * page with a photo of each business licence. Deliberately not
               * localised: the legal name, the credit code and the image are the
               * same in every language, and the Arabic and English trading names
               * sit side by side as plain fields. (A non-localised array holding
               * localised fields loses rows between languages — see primaryNav.)
               */
              name: 'licences',
              type: 'array',
              labels: { singular: 'Licence', plural: 'Business licences' },
              admin: {
                description:
                  'Each registered company, with a photo of its business licence (营业执照). Shown on the About page so a visitor can check the company is real.',
              },
              fields: [
                {
                  name: 'legalName',
                  type: 'text',
                  required: true,
                  admin: { description: 'Exactly as printed on the licence, in Chinese.' },
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'nameAr', type: 'text', required: true, admin: { width: '50%' } },
                    { name: 'nameEn', type: 'text', required: true, admin: { width: '50%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'creditCode',
                      type: 'text',
                      required: true,
                      admin: {
                        width: '50%',
                        description:
                          'The 18-character unified social credit code (统一社会信用代码).',
                      },
                    },
                    {
                      name: 'established',
                      type: 'text',
                      admin: { width: '50%', description: 'As on the licence, e.g. 2025-12-26.' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'cityAr', type: 'text', admin: { width: '50%' } },
                    { name: 'cityEn', type: 'text', admin: { width: '50%' } },
                  ],
                },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'A clear, upright photo or scan of the licence.' },
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
                {
                  name: 'instagram',
                  type: 'text',
                  defaultValue: 'https://instagram.com/higreenpanda',
                },
                {
                  name: 'youtube',
                  type: 'text',
                  defaultValue: 'https://youtube.com/@Higreenpanda',
                },
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
