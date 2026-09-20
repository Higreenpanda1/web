import { MessageCircle } from 'lucide-react'

import { whatsappLink } from '@/lib/url'

/**
 * The floating WhatsApp button, on every page.
 *
 * This audience contacts businesses through WhatsApp, not email forms (brief
 * section 9), so this is arguably the most important control on the site. It is
 * a plain anchor — no JavaScript, works before hydration, works with JS off —
 * and it uses inset-inline-end so it lands bottom-left in Arabic and
 * bottom-right in English without an RTL override.
 *
 * The white ring is not decoration: the button's green is from the same family
 * as the footer's, and without it the button vanishes the moment a visitor
 * scrolls to the bottom of a page — which is exactly where someone who has
 * read everything and wants to make contact ends up.
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
      className="fixed bottom-5 z-40 inline-flex min-h-14 items-center gap-2 rounded-[var(--radius-full)] bg-[var(--brand-700)] px-4 py-3 font-semibold text-white no-underline shadow-lg ring-2 ring-white/85 transition-colors hover:bg-[var(--brand-800)] md:px-5"
      style={{ insetInlineEnd: '1.25rem' }}
    >
      <MessageCircle size={22} strokeWidth={1.5} aria-hidden="true" />
      <span className="hidden text-body sm:inline">{label}</span>
    </a>
  )
}
