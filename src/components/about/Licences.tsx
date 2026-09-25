import { ExternalLink, FileBadge } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'

import { mediaSrc } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Media, SiteSetting } from '@/payload-types'

type Licence = NonNullable<SiteSetting['licences']>[number]

const REGISTRY = 'https://www.gsxt.gov.cn/'

/**
 * The registered companies, each as a card: the licence photo (a link to the
 * full-size file), the Chinese legal name, the trading name in the page's
 * language, the credit code and where and when it was registered. Reads the
 * `licences` array on Site settings. A licence without a photo still shows
 * its details — the code is what a careful buyer checks, not the picture.
 */
export async function Licences({
  items,
  locale,
}: {
  items: Licence[] | null | undefined
  locale: Locale
}) {
  if (!items || items.length === 0) return null
  const t = await getTranslations({ locale })

  return (
    <div>
      <ul className="grid list-none gap-6 p-0 md:grid-cols-2">
        {items.map((item, index) => {
          const photo = typeof item.image === 'object' ? (item.image as Media) : null
          const src = mediaSrc(photo, 'card')
          const full = mediaSrc(photo)
          const name = locale === 'ar' ? item.nameAr : item.nameEn
          const city = locale === 'ar' ? item.cityAr : item.cityEn
          return (
            <li
              key={item.id ?? index}
              className="overflow-hidden rounded-xl border border-border-soft bg-surface shadow-card"
              data-reveal
            >
              {src && full ? (
                <a
                  href={full}
                  target="_blank"
                  rel="noopener"
                  className="block bg-surface-sunken p-4"
                  aria-label={`${t('about.licenceView')}: ${name}`}
                >
                  <Image
                    src={src}
                    alt={photo?.alt ?? name}
                    width={768}
                    height={541}
                    sizes="(min-width: 768px) 36rem, 100vw"
                    className="aspect-[3/2] w-full rounded-md object-contain"
                  />
                </a>
              ) : (
                <div
                  aria-hidden="true"
                  className="flex aspect-[3/2] items-center justify-center bg-surface-tint text-text-brand"
                >
                  <FileBadge size={56} strokeWidth={1.25} />
                </div>
              )}
              <div className="p-6">
                <p className="text-caption text-text-muted" lang="zh-CN">
                  {item.legalName}
                </p>
                <h3 className="mt-1 text-h3">{name}</h3>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-caption text-text-muted">{t('about.licenceCode')}</dt>
                    <dd className="ltr-nums m-0 font-mono font-semibold tracking-wide text-heading">
                      {item.creditCode}
                    </dd>
                  </div>
                  {item.established ? (
                    <div>
                      <dt className="text-caption text-text-muted">
                        {t('about.licenceEstablished')}
                      </dt>
                      <dd className="m-0 font-medium text-heading">
                        <span className="ltr-nums">{item.established}</span>
                        {city ? <span className="text-text-muted"> · {city}</span> : null}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-6">
        <a
          href={REGISTRY}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 font-medium text-text-brand underline-offset-4 hover:underline"
        >
          {t('about.licenceVerify')}
          <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
        </a>
      </p>
    </div>
  )
}
