import { getTranslations } from 'next-intl/server'

import { ServiceCard } from '@/components/ServiceCard'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getServices } from '@/lib/queries'

import type { Locale } from '@/i18n/routing'
import type { Page, Service } from '@/payload-types'

type Block = Extract<NonNullable<Page['layout']>[number], { blockType: 'servicesGrid' }>

export async function ServicesGridBlock({ block, locale }: { block: Block; locale: Locale }) {
  const [services, t] = await Promise.all([
    resolveServices(block, locale),
    getTranslations({ locale }),
  ])
  if (services.length === 0) return null

  return (
    <Section tone="sunken" labelledBy={block.heading ? 'services-grid-heading' : undefined}>
      {block.heading ? (
        <SectionHeading
          id="services-grid-heading"
          eyebrow={t('home.servicesEyebrow')}
          title={block.heading}
          lead={block.lead}
        />
      ) : null}
      <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            locale={locale}
            featured={Boolean(service.featured)}
          />
        ))}
      </ul>
    </Section>
  )
}

async function resolveServices(block: Block, locale: Locale): Promise<Service[]> {
  const limit = block.limit ?? 9

  if (block.source === 'manual') {
    const picked = (block.services ?? []).filter(
      (entry): entry is Service => typeof entry === 'object' && entry !== null,
    )
    return picked.slice(0, limit)
  }

  return getServices(locale, { featuredOnly: block.source === 'featured', limit })
}
