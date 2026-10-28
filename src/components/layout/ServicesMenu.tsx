import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import '@/components/companies/companies.css'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import { getServices } from '@/lib/queries'
import { SERVICE_COMPANIES, serviceCompany } from '@/lib/service-company'
import { groupServices } from '@/lib/services'
import { NavLink } from './NavLink'

import type { Locale } from '@/i18n/routing'

/**
 * "Services" in the desktop header with a full-width panel under it (owner,
 * 28 October 2026): one column per company, HIGP first, each with a photo,
 * its name, one line on what it does, every one of its services as a direct
 * link, and a way to the company's full services page. Pure CSS: the panel
 * opens on hover and on keyboard focus inside the item, so it works before
 * any JavaScript has loaded. The panel is positioned against the sticky
 * header, not the menu item, so it spans the page.
 */
export async function ServicesMenu({ locale, label }: { locale: Locale; label: string }) {
  const [t, services] = await Promise.all([
    getTranslations({ locale }),
    getServices(locale, { limit: 60 }),
  ])
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <div className="group/menu flex h-[var(--header-height)] items-center">
      <span className="inline-flex items-center">
        <NavLink href="/services" label={label} />
        <ChevronDown
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          className="-ms-1.5 text-text-muted transition-transform group-hover/menu:rotate-180 group-focus-within/menu:rotate-180"
        />
      </span>

      <div className="invisible absolute inset-x-0 top-full z-50 border-b border-[rgb(224_163_46/0.25)] bg-[#04170b] opacity-0 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] backdrop-blur-md transition-[opacity,visibility] duration-200 group-hover/menu:visible group-hover/menu:opacity-100 group-focus-within/menu:visible group-focus-within/menu:opacity-100">
        <div className="container-page grid gap-8 py-8 lg:grid-cols-[1.45fr_1fr]">
          {SERVICE_COMPANIES.map((id) => {
            const name = t(`companies.${id}.name`)
            // In catalogue order, area by area, so the list reads down each column.
            const members = groupServices(
              services.filter((service) => serviceCompany(service) === id),
            ).flatMap((group) => group.services)
            return (
              <section
                key={id}
                aria-labelledby={`menu-${id}`}
                className={cn(
                  'grid content-start gap-5',
                  id === 'nasher' && 'lg:border-s lg:border-white/10 lg:ps-8',
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="relative block h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    <Image
                      src={`/brand/companies/${id}-1.webp`}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </span>
                  <div className="min-w-0">
                    <p id={`menu-${id}`} className="text-h3 font-bold">
                      <span className="co-name">{name}</span>
                    </p>
                    <p className="mt-1 text-caption text-text-muted">
                      {t(`services.company.lead.${id}`)}
                    </p>
                  </div>
                </div>

                <ul className={cn('list-none gap-x-6 p-0', id === 'higp' && 'sm:columns-2')}>
                  {members.map((service) => (
                    <li key={service.id} className="mb-1 break-inside-avoid">
                      <Link
                        href={`/services/${service.slug}`}
                        className="flex min-h-9 items-center gap-2 rounded-md px-2 text-[0.92rem] text-text no-underline transition-colors hover:bg-white/5 hover:text-heading"
                      >
                        <span
                          aria-hidden="true"
                          className="size-1.5 shrink-0 rounded-full bg-accent"
                        />
                        {service.title}
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/services?company=${id}`}
                  className="group/all inline-flex items-center gap-2 justify-self-start font-semibold text-accent-text no-underline"
                >
                  {t('services.company.all', { name })}
                  <Arrow
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="transition-transform rtl:group-hover/all:-translate-x-1 ltr:group-hover/all:translate-x-1"
                  />
                </Link>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
