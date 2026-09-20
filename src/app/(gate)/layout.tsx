import { plexLatin } from '@/lib/fonts'

import '@/styles/globals.css'

import type { Metadata } from 'next'

/**
 * Root layout for the two-factor sign-in gate. It is its own route group with
 * its own <html> so it shares neither the public site's header, footer and
 * WhatsApp button, nor Payload's admin bundle.
 */
export const metadata: Metadata = {
  title: 'Sign in · HiGreenPanda',
  robots: { index: false, follow: false },
}

export default function GateLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={plexLatin.variable}>
      <body className="grid min-h-dvh place-items-center bg-[var(--canvas)] p-6">{children}</body>
    </html>
  )
}
