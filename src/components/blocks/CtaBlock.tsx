import { ContactPanel } from '@/components/home/ContactPanel'
import { Section } from '@/components/ui/Section'
import { getSiteSettings } from '@/lib/queries'
import { BlockActions } from './BlockActions'

import type { Locale } from '@/i18n/routing'
import type { Page } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'cta' }>

export async function CtaBlock({ block, locale }: { block: Block; locale: Locale }) {
  const settings = await getSiteSettings(locale)

  return (
    <Section className="py-10 md:py-14">
      <ContactPanel
        id="enquire"
        locale={locale}
        settings={settings}
        heading={block.heading}
        lead={block.body}
        showForm={Boolean(block.showEnquiryForm)}
        actions={
          block.actions && block.actions.length > 0 ? (
            <BlockActions actions={block.actions} inverse />
          ) : undefined
        }
      />
    </Section>
  )
}
