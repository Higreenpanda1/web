import { isAdmin, isStaff } from '@/access'

import type { CollectionConfig } from 'payload'

/**
 * One row per run of the weekly market-research job
 * (`src/lib/automation/research/plan.ts`): when it ran, which signals it
 * gathered (autocomplete phrases, Google Trends, keyword data, the events
 * calendar), what it added to the content queue and why. The report is the
 * owner's window into what the machine is doing and the place to see that a
 * topic was chosen on evidence rather than on a whim.
 */
export const ResearchRuns: CollectionConfig = {
  slug: 'research-runs',
  labels: { singular: 'Research run', plural: 'Market research' },
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['ranAt', 'topicsAdded', 'summary'],
    group: 'Content',
    description:
      'What the weekly research job found and which topics it queued. Read-only; the topics themselves are in the content queue.',
  },
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isAdmin,
  },
  defaultSort: '-ranAt',
  fields: [
    { name: 'ranAt', type: 'date', required: true, index: true },
    {
      name: 'summary',
      type: 'text',
      required: true,
      maxLength: 300,
      admin: { description: 'One line: what was gathered and what was queued.' },
    },
    { name: 'topicsAdded', type: 'number', defaultValue: 0 },
    {
      name: 'report',
      type: 'textarea',
      admin: {
        description: 'The full report: signals, candidates, the topics chosen and the reasons.',
      },
    },
    {
      name: 'signals',
      type: 'json',
      admin: {
        description: 'The raw signals the run gathered, for anyone checking the reasoning.',
      },
    },
  ],
}
