import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'

import { ButtonLink } from '@/components/ui/Button'
import { Section, SectionHeading } from '@/components/ui/Section'
import { Link } from '@/i18n/navigation'
import { LICENCES } from '@/lib/company'

import type { Locale } from '@/i18n/routing'

/**
 * The licence scans as a row of thumbnails, each linking to its section on
 * /licences. Shown on About at the owner's request; the facts and scans come
 * from src/lib/company.ts, the same as the licences page.
 */
export async function LicencesHighlight({
  locale,
  tone,
}: {
  locale: Locale
  tone?: 'default' | 'tint' | 'sunken'
}) {
  const scans = LICENCES.flatMap((licence) =>
    licence.images.map((image) => ({ ...image, licenceId: licence.id })),
  )
  if (scans.length === 0) return null
  const t = await getTranslations({ locale })
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <Section tone={tone} labelledBy="licences-heading">
      <SectionHeading
        id="licences-heading"
        eyebrow={t('licences.eyebrow')}
        title={t('about.licencesTitle')}
        lead={t('licences.lead')}
      />
      <ul data-reveal className="grid list-none grid-cols-2 gap-4 p-0 sm:gap-5 lg:grid-cols-4">
        {scans.map((scan) => {
          // Both companies hold a "business licence", so name the company instead;
          // the certificates get a short caption without the Chinese title.
          const caption =
            scan.label === 'businessLicence'
              ? t(`licences.items.${scan.licenceId}.title`)
              : t(`licences.docsShort.${scan.label}`)
          return (
            <li key={scan.src}>
              <Link href={`/licences#${scan.licenceId}`} className="group block">
                <Image
                  src={scan.src}
                  alt={caption}
                  width={scan.width}
                  height={scan.height}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="aspect-[4/3] h-auto w-full rounded-lg border border-border-soft bg-surface object-cover shadow-card transition-shadow group-hover:shadow-lg"
                />
                <span className="mt-3 block text-caption text-text-muted">{caption}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="mt-8">
        <ButtonLink href="/licences" variant="secondary">
          {t('footer.licences')}
          <Arrow size={18} strokeWidth={2} aria-hidden="true" />
        </ButtonLink>
      </div>
    </Section>
  )
}
