import { Instagram, Linkedin, Mail, MessageCircle, Youtube } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { PlayMark } from './Logo'
import { whatsappLink } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { SiteSetting } from '@/payload-types'

export async function Footer({ locale, settings }: { locale: Locale; settings: SiteSetting }) {
  const t = await getTranslations({ locale })
  const year = new Date().getFullYear()

  const columns =
    settings.footerColumns && settings.footerColumns.length > 0
      ? settings.footerColumns
      : [
          {
            id: 'services',
            title: t('footer.servicesTitle'),
            links: [
              { id: 's1', label: t('cta.allServices'), href: '/services' },
              { id: 's2', label: t('cta.enquire'), href: '/contact' },
            ],
          },
          {
            id: 'company',
            title: t('footer.companyTitle'),
            links: [
              { id: 'c1', label: t('nav.about'), href: '/about' },
              { id: 'c2', label: t('nav.blog'), href: '/blog' },
            ],
          },
        ]

  const socials = [
    { href: settings.social?.instagram, Icon: Instagram, name: 'Instagram' },
    { href: settings.social?.youtube, Icon: Youtube, name: 'YouTube' },
    { href: settings.social?.linkedin, Icon: Linkedin, name: 'LinkedIn' },
  ].filter((entry): entry is { href: string; Icon: typeof Instagram; name: string } =>
    Boolean(entry.href),
  )

  return (
    <footer className="bg-[var(--brand-900)] text-[var(--brand-100)]">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            {/* Dark surface: the SOLID mark, never the knockout — see Logo.tsx. */}
            <div className="mb-4 flex items-center gap-2.5">
              <PlayMark onDark size={34} />
              <span className="text-h3 font-bold text-white">{t('site.name')}</span>
            </div>
            <p className="text-caption leading-relaxed text-[var(--brand-300)]">
              {t('footer.aboutBlurb')}
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.id ?? column.title} aria-label={column.title}>
              <h2 className="mb-3 text-caption font-bold tracking-wide text-white uppercase">
                {column.title}
              </h2>
              <ul className="space-y-2">
                {(column.links ?? []).map((link) => (
                  <li key={link.id ?? link.href}>
                    <Link
                      href={link.href}
                      className="text-[var(--brand-100)] no-underline hover:text-white hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="mb-3 text-caption font-bold tracking-wide text-white uppercase">
              {t('footer.contactTitle')}
            </h2>
            <ul className="space-y-3">
              <li>
                <a
                  href={whatsappLink(settings.whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[var(--brand-100)] no-underline hover:text-white hover:underline"
                >
                  <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />
                  <span className="ltr-nums">{settings.whatsappNumber}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="inline-flex items-center gap-2 text-[var(--brand-100)] no-underline hover:text-white hover:underline"
                >
                  <Mail size={18} strokeWidth={1.5} aria-hidden="true" />
                  <span className="ltr-nums">{settings.email}</span>
                </a>
              </li>
            </ul>

            {socials.length > 0 ? (
              <>
                <h2 className="mt-6 mb-3 text-caption font-bold tracking-wide text-white uppercase">
                  {t('footer.followTitle')}
                </h2>
                <ul className="flex gap-2">
                  {socials.map(({ href, Icon, name }) => (
                    <li key={name}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={name}
                        className="inline-flex size-11 items-center justify-center rounded-[var(--radius)] border border-[var(--brand-700)] text-[var(--brand-100)] transition-colors hover:bg-[var(--brand-800)] hover:text-white"
                      >
                        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--brand-800)] pt-6 text-caption text-[var(--brand-300)] md:flex-row md:items-center md:justify-between">
          <p>
            <span className="ltr-nums">© {year}</span> {settings.organisationName}.{' '}
            {t('footer.rights')}
            {settings.companyRegistration ? (
              <span className="ltr-nums"> · {settings.companyRegistration}</span>
            ) : null}
          </p>
          <ul className="flex gap-4">
            <li>
              <Link
                href="/privacy"
                className="text-[var(--brand-300)] no-underline hover:text-white hover:underline"
              >
                {t('footer.privacy')}
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="text-[var(--brand-300)] no-underline hover:text-white hover:underline"
              >
                {t('footer.terms')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
