import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

import type { Locale } from '@/i18n/routing'

import './academy.css'

const PRICES = { master: '1,500', premium: '2,900' } as const

/**
 * The course, announced on the homepage right under the hero, as a piece of
 * the course page itself: its palette, faces, gold button and paper dossier
 * (here holding Sami's photo). It carries the page's opening line, the
 * programme in four numbers, the two prices and one way in; everything else
 * lives on /academy.
 */
export async function CourseSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'academy' })
  const facts = [
    { value: '6', label: t('stages') },
    { value: '44', label: t('lessons') },
    { value: '5.5', label: t('hours') },
  ]

  return (
    <section aria-labelledby="home-academy-heading" className="ac ac-wrap" lang={locale}>
      {/* The whole card is the link: anywhere a visitor taps opens the course. */}
      <Link href="/academy" className="container-page block no-underline">
        <div className="ac-card">
          <div className="ac-grid">
            <div>
              <p className="ac-kick">{t('eyebrow')}</p>
              <p className="ac-name">{t('title')}</p>
              <h2 id="home-academy-heading" className="ac-h">
                {t.rich('quote', { em: (chunks) => <em>{chunks}</em> })}
              </h2>
              <p className="ac-lede">{t('lead')}</p>

              <dl className="ac-facts" aria-label={t('statsLabel')}>
                {facts.map((fact) => (
                  <div key={fact.label} className="ac-fact">
                    <dt>{fact.label}</dt>
                    <dd className="ac-num">{fact.value}</dd>
                  </div>
                ))}
                <div className="ac-fact">
                  <dt>{t('lifetime')}</dt>
                  <dd className="ac-inf">∞</dd>
                </div>
              </dl>

              <div className="ac-cta">
                <span className="ac-btn">{t('cta')}</span>
                <ul className="ac-prices" aria-label={t('pricesLabel')}>
                  <li>
                    <span className="ac-plan">{t('master')}</span>
                    <span className="ac-price">
                      <span className="ac-num">{PRICES.master}</span>
                      <small>{t('currency')}</small>
                    </span>
                  </li>
                  <li>
                    <span className="ac-plan">{t('premium')}</span>
                    <span className="ac-price">
                      <span className="ac-num">{PRICES.premium}</span>
                      <small>{t('currency')}</small>
                    </span>
                    <span className="ac-note">{t('premiumNote')}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="ac-file">
              <div className="ac-paper p1" aria-hidden="true" />
              <div className="ac-paper p2" aria-hidden="true" />
              <figure className="ac-dos m-0">
                <span className="ac-clip" aria-hidden="true" />
                <div className="ac-dos-h" aria-hidden="true">
                  <b>{t('fileLabel')}</b>
                  <span>{t('fileStamp')}</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element -- a 480px photo the course page already serves as-is */}
                <img
                  src="/offers/academy/sami.jpg"
                  alt={t('photoAlt')}
                  width={480}
                  height={599}
                  loading="lazy"
                />
                <figcaption>{t('photoCaption')}</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}
