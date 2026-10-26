'use client'

import { LogOut } from 'lucide-react'

import { signOut } from '@/app/actions/portal'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

export function PortalNav({
  locale,
  labels,
}: {
  locale: 'ar' | 'en'
  labels: { requests: string; account: string; signOut: string }
}) {
  const pathname = usePathname()
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-[3px] px-4 py-2 font-semibold no-underline transition-colors',
        active ? 'bg-white text-brand-900' : 'text-brand-100 hover:bg-white/10 hover:text-white',
      )}
    >
      {label}
    </Link>
  )
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {tab(
        '/portal',
        labels.requests,
        pathname === '/portal' || pathname.startsWith('/portal/requests'),
      )}
      {tab('/portal/account', labels.account, pathname.startsWith('/portal/account'))}
      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-[3px] px-4 py-2 font-semibold text-brand-100 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} aria-hidden="true" className="rtl:-scale-x-100" />
          {labels.signOut}
        </button>
      </form>
    </nav>
  )
}
