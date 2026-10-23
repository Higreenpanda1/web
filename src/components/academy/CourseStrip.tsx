import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

import type { Locale } from '@/i18n/routing'

import './academy.css'

/**
 * One line above the header on every page, announcing the course in the
 * course page's own look: deep green, gold hairline, the course name in
 * Amiri. It sits outside the sticky header, so it scrolls away and never eats
 * screen height while reading.
 */
export async function CourseStrip({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'academy' })

  return (
    <Link href="/academy" className="ac ac-strip" lang={locale}>
      <span className="container-page ac-strip-in">
        <span className="ac-strip-kick">{t('stripBadge')}</span>
        <span className="ac-strip-name">{t('stripText')}</span>
        <span className="ac-strip-sep" aria-hidden="true" />
        <span className="ac-strip-cta">{t('stripCta')}</span>
      </span>
    </Link>
  )
}
