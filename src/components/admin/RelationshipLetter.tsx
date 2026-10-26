'use client'

import { useConfig, useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

/**
 * The letter a client gives their bank to show we have dealt with them
 * before: every request from the same WhatsApp number, and what this payment
 * is for. Opens as a printable page (English and Chinese) to save as PDF,
 * sign and stamp.
 */
export function RelationshipLetter() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  if (!id) return null
  const base = `${config.routes.api}/applications/${id}/relationship`

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Letter for the client&apos;s bank</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a
          className="btn btn--style-secondary btn--size-small"
          href={`${base}?from=nasher`}
          target="_blank"
          rel="noopener"
        >
          From Nasher (goods)
        </a>
        <a
          className="btn btn--style-secondary btn--size-small"
          href={`${base}?from=higp`}
          target="_blank"
          rel="noopener"
        >
          From HiGP (services)
        </a>
      </div>
    </div>
  )
}
