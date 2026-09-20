import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { ButtonLink } from '@/components/ui/Button'
import { Logo } from './Logo'
import { LocaleSwitcher } from './LocaleSwitcher'
import { MobileNav } from './MobileNav'

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
          { label: t('nav.about'), href: '/about' },
          { label: t('nav.blog'), href: '/blog' },
          { label: t('nav.contact'), href: '/contact' },
        ]

  return (
    <header className="relative sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
      <div className="container-page flex h-[var(--header-height)] items-center justify-between gap-2 md:gap-4">
        <Link href="/" className="no-underline" aria-label={t('site.name')}>
          <Logo label={t('site.name')} />
        </Link>

        <nav aria-label={t('nav.primary')} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-[var(--radius)] px-3 py-2 font-semibold text-[var(--text)] no-underline transition-colors hover:bg-[var(--surface-tint)] hover:text-[var(--text-brand)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher
            locale={locale}
            label={t('locale.label')}
            switchTo={t('locale.switchTo')}
          />
          {/* The wrapper, rather than `hidden sm:inline-flex` on the button
              itself: `hidden` and the button's own `inline-flex` both set
              `display`, and which one wins is decided by the order Tailwind
              emits them, not by the order they are written. On a 390px phone
              the button stayed visible, pushed the header 96px past the
              viewport, and put the language switcher off-screen entirely. */}
          <span className="hidden sm:block">
            <ButtonLink href="/contact">{t('cta.enquire')}</ButtonLink>
          </span>
          <MobileNav
            items={items}
            openLabel={t('nav.openMenu')}
            closeLabel={t('nav.closeMenu')}
            navLabel={t('nav.primary')}
          />
        </div>
      </div>
    </header>
  )
}
