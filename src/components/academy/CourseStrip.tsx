import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

import type { Locale } from '@/i18n/routing'

/**
 * One line above the header on every page, announcing the course. It sits
 * outside the sticky header, so it scrolls away and never eats screen height
 * while reading. The colours are the course page's own (deep green and gold),
 * so the line reads as a door into that page rather than a site banner.
 */
export async function CourseStrip({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'academy' })
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <Link
      href="/academy"
      className="group block bg-[#062414] text-[#EAF2EC] no-underline hover:bg-[#0a2f1b]"
    >
      <span className="container-page flex min-h-10 items-center justify-center gap-2.5 py-2 text-center text-caption leading-snug">
        <span className="shrink-0 rounded-full border border-[#E0A32E]/60 px-2 py-0.5 text-[0.75rem] font-semibold text-[#F0C56A]">
          {t('stripBadge')}
        </span>
        <span className="min-w-0">
          {t('stripText')}
          <span className="hidden sm:inline"> · </span>
          <span className="hidden font-semibold text-[#F0C56A] underline-offset-4 group-hover:underline sm:inline">
            {t('stripCta')}
          </span>
        </span>
        <Arrow size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 text-[#F0C56A]" />
      </span>
    </Link>
  )
}
