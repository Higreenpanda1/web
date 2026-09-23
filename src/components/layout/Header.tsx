import { getTranslations } from 'next-intl/server'

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { whatsappLink } from '@/lib/url'
import { LocaleSwitcher } from './LocaleSwitcher'
import { Wordmark } from './Logo'
import { MobileNav } from './MobileNav'
import { NavLink } from './NavLink'

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
          { label: t('nav.about'), href: '/about' },
          { label: t('nav.blog'), href: '/blog' },
          { label: t('nav.contact'), href: '/contact' },
        ]

  const whatsapp = whatsappLink(settings.whatsappNumber, settings.whatsappPrefill ?? undefined)

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-surface/85 backdrop-blur-md">
      <div className="container-page flex h-[var(--header-height)] items-center justify-between gap-3">
        <Link href="/" className="shrink-0 rounded-sm no-underline" aria-label={t('site.name')}>
          <Wordmark height={48} className="h-10 w-auto md:h-12" />
          <span className="sr-only">{t('site.name')}</span>
        </Link>

        <nav aria-label={t('nav.primary')} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher
            locale={locale}
            label={t('locale.label')}
            switchTo={t('locale.switchTo')}
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
            <ButtonLink href="/apply/company-registration">{t('cta.startCompany')}</ButtonLink>
          </span>
          <MobileNav
            items={items}
            openLabel={t('nav.openMenu')}
            closeLabel={t('nav.closeMenu')}
            navLabel={t('nav.primary')}
            ctaLabel={t('cta.startCompany')}
            ctaHref="/apply/company-registration"
            whatsappLabel={t('cta.whatsapp')}
            whatsappHref={whatsapp}
          >
            <LocaleSwitcher
              locale={locale}
              label={t('locale.label')}
              switchTo={t('locale.switchTo')}
              className="sm:hidden"
            />
          </MobileNav>
        </div>
      </div>
    </header>
  )
}
