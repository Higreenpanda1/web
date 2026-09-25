import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { whatsappLink } from '@/lib/url'

/**
 * The floating WhatsApp button, on every page.
 *
 * This audience contacts businesses through WhatsApp, not email forms (brief
 * section 9), so this is arguably the most important control on the site. It is
 * a plain anchor — no JavaScript, works before hydration, works with JS off —
 * and `end-5` is inset-inline-end, so it lands bottom-left in Arabic and
 * bottom-right in English without an RTL override.
 *
 * The white ring is not decoration: the button's green is from the same family
 * as the footer's, and without it the button vanishes the moment a visitor
 * scrolls to the bottom of a page. The slow pulse behind it is the one piece
 * of motion on the page that runs unprompted; it stops for reduced-motion.
 *
 * `--consent-offset` is set by the consent banner (analytics/ConsentBanner.tsx)
 * while it is open on a phone, so the two never fight for the same corner;
 * it is 0 the rest of the time.
 */
export function WhatsAppButton({
  number,
  label,
  ariaLabel,
  prefill,
}: {
  number: string
  label: string
  ariaLabel: string
  prefill?: string | null
}) {
  return (
    <a
      href={whatsappLink(number, prefill ?? undefined)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      data-analytics-event="whatsapp_click"
      data-analytics-location="floating"
      className="group fixed bottom-[calc(1.25rem+var(--consent-offset,0px))] end-5 z-40 inline-flex min-h-14 items-center gap-2.5 rounded-full bg-brand-700 px-4 py-3 font-semibold text-white no-underline shadow-float ring-2 ring-white/90 transition-colors hover:bg-brand-800 md:px-5"
    >
      <span className="relative inline-flex size-6 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-brand-400/70 motion-safe:animate-pulse-ring"
        />
        <WhatsAppIcon size={24} className="relative" />
      </span>
      <span className="hidden text-body sm:inline">{label}</span>
    </a>
  )
}
