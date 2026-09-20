import { MessageCircle } from 'lucide-react'

import { whatsappLink } from '@/lib/url'

/**
 * The floating WhatsApp button, on every page.
 *
 * This audience contacts businesses through WhatsApp, not email forms (brief
 * section 9), so this is arguably the most important control on the site. It is
 * a plain anchor — no JavaScript, works before hydration, works with JS off —
 * and it sits above the fold's reach on mobile without covering content, using
 * inset-inline-end so it lands bottom-left in Arabic and bottom-right in
 * English without an RTL override.
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
      className="fixed bottom-5 z-40 inline-flex min-h-14 items-center gap-2 rounded-[var(--radius-full)] bg-[var(--brand-700)] px-4 py-3 font-semibold text-white no-underline shadow-lg transition-colors hover:bg-[var(--brand-800)] md:px-5"
      style={{ insetInlineEnd: '1.25rem' }}
    >
      <MessageCircle size={22} strokeWidth={1.5} aria-hidden="true" />
      <span className="hidden text-body sm:inline">{label}</span>
    </a>
  )
}
