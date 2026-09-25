import { Facebook, Instagram, Linkedin, Mail, MapPin, Youtube } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { TikTokIcon } from '@/components/icons/TikTokIcon'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { Link } from '@/i18n/navigation'
import { SERVICE_CATEGORIES } from '@/lib/catalogue'
import { whatsappLink } from '@/lib/url'
import { Wordmark } from './Logo'

import type { Locale } from '@/i18n/routing'
import type { SiteSetting } from '@/payload-types'
import type { ComponentType } from 'react'

type SocialIcon = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
type SocialLink = { href: string; Icon: SocialIcon; name: string }

export async function Footer({ locale, settings }: { locale: Locale; settings: SiteSetting }) {
  const t = await getTranslations({ locale })
  const year = new Date().getFullYear()

  const columns =
    settings.footerColumns && settings.footerColumns.length > 0
      ? settings.footerColumns
      : [
          {
            // One link per area of the business, straight from the catalogue,
            // so the footer grows with the services page and never lists a
            // group that has nothing in it.
            id: 'areas',
            title: t('footer.areasTitle'),
            links: SERVICE_CATEGORIES.map((category) => ({
              id: `area-${category}`,
              label: t(`services.categories.${category}.title`),
              href: `/services#${category}`,
            })),
          },
          {
            id: 'services',
            title: t('footer.servicesTitle'),
            links: [
              { id: 's1', label: t('cta.allServices'), href: '/services' },
              { id: 's2', label: t('apply.types.consultation.cta'), href: '/apply/consultation' },
              { id: 's3', label: t('cta.enquire'), href: '/contact' },
            ],
          },
          {
            id: 'company',
            title: t('footer.companyTitle'),
            links: [
              { id: 'c1', label: t('nav.about'), href: '/about' },
              { id: 'c2', label: t('nav.blog'), href: '/blog' },
              { id: 'c3', label: t('nav.contact'), href: '/contact' },
            ],
          },
        ]

  const candidates: Array<{ href?: string | null; Icon: SocialIcon; name: string }> = [
    { href: settings.social?.instagram, Icon: Instagram, name: 'Instagram' },
    { href: settings.social?.youtube, Icon: Youtube, name: 'YouTube' },
    { href: settings.social?.tiktok, Icon: TikTokIcon, name: 'TikTok' },
    { href: settings.social?.facebook, Icon: Facebook, name: 'Facebook' },
    { href: settings.social?.linkedin, Icon: Linkedin, name: 'LinkedIn' },
  ]
  const socials = candidates.filter((entry): entry is SocialLink => Boolean(entry.href))

  const offices = (settings.offices ?? []).map((office) => office.city).filter(Boolean)

  return (
    <footer className="relative isolate overflow-hidden bg-gradient-deep text-brand-100">
      <div className="absolute inset-0 -z-10 bg-dots-inverse opacity-60" aria-hidden="true" />
      <div className="container-page pt-16 pb-10">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            {/* Dark surface: the SOLID mark, never the knockout — see Logo.tsx. */}
            <Wordmark onDark height={56} title={t('site.name')} />
            <p className="mt-5 max-w-[26rem] text-body-lg leading-relaxed text-brand-100">
              {t('footer.aboutBlurb')}
            </p>
            {offices.length > 0 ? (
              <p className="mt-4 inline-flex items-center gap-2 text-caption text-brand-300">
                <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
                {offices.join(' · ')}
              </p>
            ) : null}
            {socials.length > 0 ? (
              <ul className="mt-6 flex gap-2">
                {socials.map(({ href, Icon, name }) => (
                  <li key={name}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-brand-100 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                    >
                      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-8 lg:col-span-4">
            {columns.map((column) => (
              <nav key={column.id ?? column.title} aria-label={column.title}>
                <h2 className="mb-4 text-eyebrow font-bold tracking-[0.14em] text-white uppercase">
                  {column.title}
                </h2>
                <ul className="space-y-2.5">
                  {(column.links ?? []).map((link) => (
                    <li key={link.id ?? link.href}>
                      <Link
                        href={link.href}
                        className="text-brand-100 no-underline transition-colors hover:text-white hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="lg:col-span-3">
            <h2 className="mb-4 text-eyebrow font-bold tracking-[0.14em] text-white uppercase">
              {t('footer.contactTitle')}
            </h2>
            <a
              href={whatsappLink(settings.whatsappNumber, settings.whatsappPrefill ?? undefined)}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-event="whatsapp_click"
              data-analytics-location="footer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white px-5 font-semibold text-brand-900 no-underline transition-colors hover:bg-brand-50"
            >
              <WhatsAppIcon size={20} className="text-brand-700" />
              {t('cta.whatsapp')}
            </a>
            <p className="mt-3 text-center text-caption text-brand-300">
              <span className="ltr-nums">{settings.whatsappNumber}</span>
            </p>
            <a
              href={`mailto:${settings.email}`}
              className="mt-5 inline-flex items-center gap-2 text-brand-100 no-underline hover:text-white hover:underline"
            >
              <Mail size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="ltr-nums">{settings.email}</span>
            </a>
            {settings.workingHours ? (
              <p className="mt-3 text-caption text-brand-300">{settings.workingHours}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-caption text-brand-300 md:flex-row md:items-center md:justify-between">
          <p>
            <span className="ltr-nums">© {year}</span> {settings.organisationName}.{' '}
            {t('footer.rights')}
            {settings.companyRegistration ? (
              <span className="ltr-nums"> · {settings.companyRegistration}</span>
            ) : null}
          </p>
          <ul className="flex gap-5">
            <li>
              <Link
                href="/privacy"
                className="text-brand-300 no-underline hover:text-white hover:underline"
              >
                {t('footer.privacy')}
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="text-brand-300 no-underline hover:text-white hover:underline"
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
