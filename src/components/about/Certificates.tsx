import { getTranslations } from 'next-intl/server'
import Image from 'next/image'

import type { Locale } from '@/i18n/routing'

/**
 * The accounting team's professional certificates (the owner's Drive,
 * 26 September 2026), with the registered address of the accounting office.
 * Static files in public/brand/certificates; personal numbers were masked by the
 * owner before upload.
 */
const CERTIFICATES = [
  {
    src: '/brand/certificates/accounting-qualification.webp',
    width: 1400,
    height: 1011,
    legalName: '会计专业技术资格',
    key: 'accounting',
  },
  {
    src: '/brand/certificates/tax-advisor.webp',
    width: 1400,
    height: 1050,
    legalName: '税务师',
    key: 'tax',
  },
] as const

export const ACCOUNTING_ADDRESS = '深圳市罗湖区深南东路5016号京基一百大厦A座41楼'

export async function Certificates({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale })

  return (
    <div>
      <ul className="grid list-none gap-6 p-0 md:grid-cols-2">
        {CERTIFICATES.map((item) => {
          const name = t(`about.certificates.${item.key}`)
          return (
            <li
              key={item.key}
              className="overflow-hidden rounded-xl border border-border-soft bg-surface shadow-card"
              data-reveal
            >
              <a
                href={item.src}
                target="_blank"
                rel="noopener"
                className="block bg-surface-sunken p-4"
                aria-label={`${t('about.licenceView')}: ${name}`}
              >
                <Image
                  src={item.src}
                  alt={name}
                  width={item.width}
                  height={item.height}
                  sizes="(min-width: 768px) 36rem, 100vw"
                  className="aspect-[3/2] w-full rounded-md object-contain"
                />
              </a>
              <div className="p-6">
                <p className="text-caption text-text-muted" lang="zh-CN">
                  {item.legalName}
                </p>
                <h3 className="mt-1 text-h3">{name}</h3>
                <p className="mt-2 text-text-muted">{t('about.certificates.holder')}</p>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-6">
        <span className="text-caption text-text-muted">{t('about.certificates.address')}</span>
        <br />
        <span className="font-medium text-heading" lang="zh-CN">
          {ACCOUNTING_ADDRESS}
        </span>
      </p>
    </div>
  )
}
