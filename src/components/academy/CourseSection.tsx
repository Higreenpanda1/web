import { ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

import type { Locale } from '@/i18n/routing'

const PRICES = { master: '1,500', premium: '2,900' } as const

/**
 * The course, announced on the homepage right under the hero. A dark panel in
 * the course page's own palette (deep green, gold for numbers only), carrying
 * the page's opening line, the programme in four numbers, the two prices and
 * one way in. Everything else lives on /academy.
 */
export async function CourseSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'academy' })
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight
  const stats = [
    { value: '6', label: t('stages') },
    { value: '44', label: t('lessons') },
    { value: '5.5', label: t('hours') },
    { value: '∞', label: t('lifetime') },
  ]

  return (
    <section aria-labelledby="home-academy-heading" className="py-12 md:py-16">
      <div className="container-page">
        <div className="relative isolate overflow-hidden rounded-xl bg-[#062414] text-[#EAF2EC] shadow-[0_30px_60px_-30px_rgb(6_36_20/0.6)]">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_85%_0%,#0f4a2a_0%,transparent_60%)]"
          />
          <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-10 md:p-12 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-w-0">
              <p className="mb-4 text-caption font-semibold tracking-wide text-[#F0C56A]">
                {t('eyebrow')}
              </p>
              <h2 id="home-academy-heading" className="text-white">
                {t('title')}
              </h2>
              <p className="mt-5 border-s-2 border-[#E0A32E] ps-4 text-h3 leading-snug font-semibold text-white">
                {t('quote')}
              </p>
              <p className="mt-5 max-w-[var(--measure)] text-body-lg text-[#A9BFAF]">{t('lead')}</p>

              <dl
                aria-label={t('statsLabel')}
                className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4"
              >
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-1 bg-[#062414] px-4 py-3">
                    <dt className="order-2 text-caption text-[#A9BFAF]">{stat.label}</dt>
                    <dd className="ltr-nums order-1 m-0 text-h3 font-bold text-[#F0C56A]">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/academy"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#E0A32E] px-7 py-3.5 text-body-lg font-semibold text-[#062414] no-underline transition-colors hover:bg-[#F0C56A]"
                >
                  {t('cta')}
                  <Arrow size={18} strokeWidth={2} aria-hidden="true" />
                </Link>
                <ul
                  aria-label={t('pricesLabel')}
                  className="flex list-none flex-wrap gap-x-6 gap-y-2 p-0"
                >
                  <li>
                    <span className="text-[#A9BFAF]">{t('master')} · </span>
                    <span className="ltr-nums font-bold text-white">{PRICES.master}</span>{' '}
                    <span className="text-[#A9BFAF]">{t('currency')}</span>
                  </li>
                  <li>
                    <span className="text-[#A9BFAF]">{t('premium')} · </span>
                    <span className="ltr-nums font-bold text-white">{PRICES.premium}</span>{' '}
                    <span className="text-[#A9BFAF]">{t('currency')}</span>
                    <span className="block text-caption text-[#A9BFAF]">{t('premiumNote')}</span>
                  </li>
                </ul>
              </div>
            </div>

            <figure className="m-0 max-w-[14rem] md:max-w-none">
              <Image
                src="/offers/academy/sami.jpg"
                alt={t('photoAlt')}
                width={480}
                height={599}
                sizes="(min-width: 1024px) 17rem, 15rem"
                className="h-auto w-full rounded-lg border border-[#E0A32E]/30 object-cover"
              />
              <figcaption className="mt-3 text-caption text-[#A9BFAF]">
                {t('photoCaption')}
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  )
}
