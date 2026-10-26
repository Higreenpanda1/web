'use client'

import { useConfig, useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

/**
 * The quote and the three invoices of a HiGP service request, each opened as
 * a printable page (Chinese and English) to save as PDF and send on WhatsApp.
 * They print what is saved, so save after changing the services below.
 */
export function BillingDocuments() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  if (!id) return null
  const base = `${config.routes.api}/applications/${id}/document`

  const links: Array<[string, string, 'primary' | 'secondary']> = [
    ['Quote', base, 'primary'],
    ['Invoice: 50% deposit', `${base}?kind=invoice&stage=deposit`, 'secondary'],
    ['Invoice: balance', `${base}?kind=invoice&stage=balance`, 'secondary'],
    ['Invoice: full (3.5% off)', `${base}?kind=invoice&stage=full`, 'secondary'],
  ]

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      {links.map(([label, href, style]) => (
        <a
          key={label}
          className={`btn btn--style-${style} btn--size-medium`}
          href={href}
          target="_blank"
          rel="noopener"
        >
          {label}
        </a>
      ))}
    </div>
  )
}
