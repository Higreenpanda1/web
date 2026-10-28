import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { CityRotator } from '@/components/ui/CityRotator'
import { Container } from '@/components/ui/Container'
import { CountUp } from '@/components/ui/CountUp'
import { Link } from '@/i18n/navigation'
import { BrandTitle } from './BrandTitle'
import { CompanyFilm } from './CompanyFilm'
import { HighlightScope } from './HighlightScope'
import { companyTags } from './rich'

import type { Locale } from '@/i18n/routing'

const COMPANIES = [
  { id: 'higp', href: '/higp', label: 'HIGP' },
  { id: 'nasher', href: '/nasher', label: 'NASHER' },
] as const

/**
 * The homepage opening since 28 October 2026: HiGreenPanda as the brand
 * that runs two companies, each behind its own card. HIGP comes first, as
 * the owner ordered; each card plays a short film and opens the company's
 * page. The old "from idea to warehouse" hero now lives on the HIGP page.
 */
export async function BrandHero({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale })
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <section className="theme-deep relative isolate overflow-hidden bg-gradient-deep">
      <div className="absolute inset-0 -z-10 bg-dots opacity-30" aria-hidden="true" />
      <div aria-hidden="true" className="orb -top-24 end-[8%] -z-10 size-[28rem] bg-brand-600/20" />

      <Container className="py-12 md:py-16 lg:py-20">
        <HighlightScope loop>
          <p className="reveal inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-caption font-semibold text-heading shadow-sm">
            <MapPin size={16} strokeWidth={2} aria-hidden="true" className="text-accent" />
            <CityRotator
              cities={[t('home.heroCity1'), t('home.heroCity2'), t('home.heroCity3')]}
              fullList={t('home.heroEyebrow')}
            />
          </p>

          <BrandTitle
            main={t('companies.brand.titleMain')}
            tail={t('companies.brand.titleTail')}
            full={t('companies.brand.titleFull')}
          />

          <p className="reveal reveal-2 mt-6 max-w-[62ch] text-body-lg text-text-muted">
            {t.rich('companies.brand.lead', companyTags)}
          </p>

          <ul className="mt-10 grid list-none gap-5 p-0 md:grid-cols-2">
            {COMPANIES.map((company, index) => (
              <li key={company.id} className="reveal reveal-3 min-w-0">
                <Link
                  href={company.href}
                  className="co-card group"
                  aria-label={t('companies.brand.enterAria', {
                    name: t(`companies.${company.id}.name`),
                  })}
                >
                  <CompanyFilm
                    label={company.label}
                    kicker={t(`companies.${company.id}.filmKicker`)}
                    delay={index * 700}
                    frames={[1, 2, 3, 4].map((n) => ({
                      src: `/brand/companies/${company.id}-${n}.webp`,
                      caption: t(`companies.${company.id}.film.${n}` as 'companies.higp.film.1'),
                    }))}
                  />
                  <div className="grid gap-2 p-5 md:p-6">
                    <h2 className="text-h3">
                      <span className="co-name">{t(`companies.${company.id}.name`)}</span>
                    </h2>
                    <p className="text-text-muted">
                      {t.rich(`companies.${company.id}.cardBody`, companyTags)}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-2 font-semibold text-accent-text">
                      {t('companies.brand.enter')}
                      <Arrow
                        size={18}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="transition-transform rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <dl className="reveal reveal-4 mt-12 grid grid-cols-2 gap-4 border-t border-border-soft pt-8 sm:grid-cols-4 sm:gap-8">
            {(
              [
                ['235+', t('home.stats.cities')],
                ['100+', t('home.stats.fairs')],
                ['120K+', t('home.stats.followers')],
                ['63+', t('home.stats.companies')],
              ] as const
            ).map(([value, label]) => (
              <div key={label}>
                <dt className="text-h2 font-bold text-heading">
                  <CountUp value={value} className="ltr-nums" />
                </dt>
                <dd className="mt-0.5 text-caption text-text-muted">{label}</dd>
              </div>
            ))}
          </dl>
        </HighlightScope>
      </Container>
    </section>
  )
}
