import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'

import { ButtonLink } from '@/components/ui/Button'
import { Section, SectionHeading } from '@/components/ui/Section'
import { HEADQUARTERS } from '@/lib/company'

import type { Locale } from '@/i18n/routing'

/**
 * The KK100 tower photo with the Shenzhen address, as a teaser for
 * /licences. Shown on the homepage and on About at the owner's request;
 * renders nothing until HEADQUARTERS has a photo.
 */
export async function OfficeHighlight({
  locale,
  tone,
}: {
  locale: Locale
  tone?: 'default' | 'tint' | 'sunken'
}) {
  if (!HEADQUARTERS.photo) return null
  const t = await getTranslations({ locale })
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <Section tone={tone} labelledBy="office-heading">
      <div
        data-reveal
        className="grid items-center gap-8 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-12"
      >
        <Image
          src={HEADQUARTERS.photo}
          alt={t('licences.hq.photoAlt')}
          width={989}
          height={1318}
          sizes="(min-width: 768px) 320px, 100vw"
          className="aspect-[4/5] h-auto w-full max-w-xs rounded-lg border border-border-soft object-cover shadow-card"
        />
        <div>
          <SectionHeading
            id="office-heading"
            eyebrow={t('licences.hq.eyebrow')}
            title={t('licences.hq.title')}
            lead={t('licences.hq.lead')}
            className="mb-5 md:mb-5"
          />
          {HEADQUARTERS.addressEn ? (
            <address className="flex items-start gap-3 not-italic" lang="en">
              <MapPin
                size={20}
                strokeWidth={1.75}
                aria-hidden="true"
                className="mt-1 shrink-0 text-text-brand"
              />
              <span>
                {HEADQUARTERS.addressEn.map((line) => (
                  <bdi key={line} className="block">
                    {line}
                  </bdi>
                ))}
              </span>
            </address>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/licences" variant="secondary">
              {t('footer.licences')}
              <Arrow size={18} strokeWidth={2} aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </div>
    </Section>
  )
}
