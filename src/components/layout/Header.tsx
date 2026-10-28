import { getTranslations } from 'next-intl/server'

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { localePath, whatsappLink } from '@/lib/url'
import { LocaleSwitcher } from './LocaleSwitcher'
import { Wordmark } from './Logo'
import { MobileNav } from './MobileNav'
import { NavLink } from './NavLink'
import { ServicesMenu } from './ServicesMenu'

import type { Locale } from '@/i18n/routing'
import type { SiteSetting } from '@/payload-types'

export async function Header({ locale, settings }: { locale: Locale; settings: SiteSetting }) {
  const t = await getTranslations({ locale })

  // Navigation is editable in Site settings; these are the fallbacks so a fresh
  // install is never left without a menu.
  const items =
    settings.primaryNav && settings.primaryNav.length > 0
      ? settings.primaryNav.map((item) => ({ label: item.label, href: item.href }))
      : [
          { label: t('nav.services'), href: '/services' },
          { label: t('nav.consultation'), href: '/apply/consultation' },
          { label: t('nav.academy'), href: '/academy' },
          { label: t('nav.about'), href: '/about' },
          { label: t('nav.blog'), href: '/blog' },
          { label: t('nav.contact'), href: '/contact' },
        ]
  // The course page always has a way in, even from a menu edited in Site
  // settings before it existed: it goes just before the last item (Contact).
  if (!items.some((item) => item.href === '/academy')) {
    items.splice(Math.max(items.length - 1, 0), 0, { label: t('nav.academy'), href: '/academy' })
  }
  // The two companies lead the menu (owner, 28 October 2026), HIGP first,
  // whatever Site settings holds.
  const companies = [
    { label: t('companies.higp.short'), href: '/higp' },
    { label: t('companies.nasher.short'), href: '/nasher' },
  ].filter((company) => !items.some((item) => item.href === company.href))
  items.unshift(...companies)

  const whatsapp = whatsappLink(settings.whatsappNumber, settings.whatsappPrefill ?? undefined)
  // The portal is in Arabic and English; the Chinese site's link opens the English one.
  const portalHref = localePath(locale === 'zh' ? 'en' : locale, '/portal/login')

  return (
    <header className="theme-deep sticky top-0 z-40 border-b border-[rgb(224_163_46/0.18)] bg-[rgb(6_36_20/0.9)] backdrop-blur-md">
      <div className="container-page flex h-[var(--header-height)] items-center justify-between gap-3">
        <Link href="/" className="shrink-0 rounded-sm no-underline" aria-label={t('site.name')}>
          <Wordmark height={48} className="h-10 w-auto md:h-12" />
          <span className="sr-only">{t('site.name')}</span>
        </Link>

        <nav aria-label={t('nav.primary')} className="hidden xl:block">
          <ul className="flex items-center">
            {items.map((item) => (
              <li key={item.href}>
                {item.href === '/services' ? (
                  <ServicesMenu locale={locale} label={item.label} />
                ) : (
                  <NavLink href={item.href} label={item.label} />
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={portalHref}
            className="hidden whitespace-nowrap rounded-[3px] px-3 py-2 text-caption font-semibold text-brand-100 no-underline transition-colors hover:bg-white/10 hover:text-white xl:inline-flex"
          >
            {t('nav.clientLogin')}
          </a>
          <LocaleSwitcher
            locale={locale}
            label={t('locale.label')}
            className="hidden sm:inline-flex"
          />
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('cta.whatsapp')}
            title={t('cta.whatsapp')}
            className="hidden size-11 items-center justify-center rounded-full border border-border bg-surface text-text-brand transition-colors hover:border-brand-300 hover:bg-surface-tint-soft md:inline-flex"
          >
            <WhatsAppIcon size={20} />
          </a>
          {/* The wrapper, rather than `hidden sm:inline-flex` on the button
              itself: both would set `display` and Tailwind's emission order
              would decide the winner. */}
          <span className="hidden sm:block">
            <ButtonLink href="/apply/company-registration" className="whitespace-nowrap">
              {t('cta.startCompany')}
            </ButtonLink>
          </span>
          <MobileNav
            items={items.map((item) =>
              item.href === '/services'
                ? {
                    ...item,
                    sub: [
                      {
                        label: t('services.company.view.higp'),
                        href: '/services?company=higp',
                      },
                      {
                        label: t('services.company.view.nasher'),
                        href: '/services?company=nasher',
                      },
                    ],
                  }
                : item,
            )}
            openLabel={t('nav.openMenu')}
            closeLabel={t('nav.closeMenu')}
            navLabel={t('nav.primary')}
            ctaLabel={t('cta.startCompany')}
            ctaHref="/apply/company-registration"
            whatsappLabel={t('cta.whatsapp')}
            whatsappHref={whatsapp}
          >
            <LocaleSwitcher locale={locale} label={t('locale.label')} className="sm:hidden" />
            <a
              href={portalHref}
              className="inline-flex min-h-11 items-center font-semibold text-text-brand no-underline"
            >
              {t('nav.clientLogin')}
            </a>
          </MobileNav>
        </div>
      </div>
    </header>
  )
}
