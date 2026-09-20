import type { Field } from 'payload'

/** URL-safe slug. Arabic is transliterated by hand by the editor, not machine
 *  generated — an Arabic slug percent-encodes into an unreadable URL and the
 *  search traffic this site depends on is better served by Latin slugs. */
export function slugField(sourceField = 'title'): Field {
  return {
    name: 'slug',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    // Not localised: one slug per document, shared by both locales, so
    // /services/sourcing and /en/services/sourcing are the same document and
    // the language switcher can stay on the equivalent page.
    localized: false,
    admin: {
      position: 'sidebar',
      description: 'Lowercase Latin letters, numbers and hyphens. Used in the URL for both languages.',
    },
    validate: (value: unknown) => {
      if (typeof value !== 'string' || value.length === 0) return 'A slug is required.'
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
        return 'Use lowercase Latin letters, numbers and single hyphens, e.g. product-sourcing.'
      }
      if (value.length > 80) return 'Keep the slug under 80 characters.'
      return true
    },
    hooks: {
      beforeValidate: [
        ({ value, data }) => {
          if (typeof value === 'string' && value.trim().length > 0) return slugify(value)
          const source = (data as Record<string, unknown> | undefined)?.[sourceField]
          if (typeof source === 'string') return slugify(source)
          return value
        },
      ],
    },
  }
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
