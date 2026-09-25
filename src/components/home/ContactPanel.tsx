import { Mail } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { EnquiryFormSection } from '@/components/forms/EnquiryFormSection'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { PlayMark } from '@/components/layout/Logo'
import { ButtonLink } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { whatsappLink } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { SiteSetting } from '@/payload-types'
import type { ReactNode } from 'react'

/**
 * The closing panel: WhatsApp first, the form second — in that order because
 * that is the order this audience uses them (brief section 9).
 */
export async function ContactPanel({
  locale,
  settings,
  eyebrow,
  heading,
  lead,
  actions,
  showForm = true,
  id,
}: {
  locale: Locale
  settings: SiteSetting
  eyebrow?: string | null
  heading: string
  lead?: string | null
  actions?: ReactNode
  showForm?: boolean
  id?: string
}) {
  const t = await getTranslations({ locale })
  const whatsapp = whatsappLink(settings.whatsappNumber, settings.whatsappPrefill ?? undefined)

  return (
    <div
      id={id}
      className="relative isolate overflow-hidden rounded-2xl bg-gradient-deep p-6 text-white sm:p-10 md:p-14"
    >
      <div className="absolute inset-0 -z-10 bg-dots-inverse opacity-40" aria-hidden="true" />
      <PlayMark
        onDark
        size={460}
        className="pointer-events-none absolute -bottom-40 -start-28 -z-10 opacity-[0.08]"
      />

      <div
        className={
          showForm
            ? 'grid items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16'
            : 'max-w-[var(--measure)]'
        }
      >
        <div>
          {eyebrow ? (
            <Eyebrow inverse className="mb-3">
              {eyebrow}
            </Eyebrow>
          ) : null}
          <h2 className="text-white">{heading}</h2>
          {lead ? <p className="mt-4 text-body-lg text-brand-100">{lead}</p> : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink
              href={whatsapp}
              size="lg"
              variant="inverse"
              data-analytics-event="whatsapp_click"
              data-analytics-location="home_contact"
            >
              <WhatsAppIcon size={22} className="text-brand-700" />
              {t('cta.whatsapp')}
            </ButtonLink>
            {actions}
          </div>

          <p className="mt-4 text-caption text-brand-300">
            <span className="ltr-nums">{settings.whatsappNumber}</span>
          </p>

          <a
            href={`mailto:${settings.email}`}
            className="mt-6 inline-flex items-center gap-2 text-brand-100 no-underline hover:text-white hover:underline"
          >
            <Mail size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="ltr-nums">{settings.email}</span>
          </a>

          {showForm ? (
            <p className="mt-8 text-caption text-brand-300">{t('home.contactOr')}</p>
          ) : null}
        </div>

        {showForm ? (
          <div className="rounded-xl bg-surface p-6 text-text shadow-float md:p-8">
            <EnquiryFormSection locale={locale} compact />
          </div>
        ) : null}
      </div>
    </div>
  )
}
