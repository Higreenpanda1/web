import { EnquiryFormSection } from '@/components/forms/EnquiryFormSection'
import { Section } from '@/components/ui/Section'
import { BlockActions } from './BlockActions'

import type { Locale } from '@/i18n/routing'
import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'cta' }>

export function CtaBlock({ block, locale }: { block: Block; locale: Locale }) {
  if (block.showEnquiryForm) {
    return (
      <Section tone="sunken" id="enquire">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2>{block.heading}</h2>
            {block.body ? (
              <p className="mt-4 max-w-[var(--measure)] text-body-lg text-[var(--text-muted)]">
                {block.body}
              </p>
            ) : null}
            <BlockActions actions={block.actions} />
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
            <EnquiryFormSection locale={locale} compact />
          </div>
        </div>
      </Section>
    )
  }

  return (
    <Section tone="inverse" id="enquire">
      <div className="max-w-[var(--measure)]">
        <h2 className="text-white">{block.heading}</h2>
        {block.body ? <p className="mt-4 text-body-lg text-[var(--brand-100)]">{block.body}</p> : null}
        <BlockActions actions={block.actions} inverse />
      </div>
    </Section>
  )
}
