'use client'

import { Button, useConfig, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React, { useState } from 'react'

/**
 * Sidebar button on a customer account: makes a one-time sign-in link to
 * send the client on WhatsApp, for clients who do not use email. A new link
 * replaces the last one; it works once, within 24 hours.
 */
export function PortalLoginLink() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const disabled = useFormFields(([fields]) => fields.disabled?.value)
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'busy' }
    | { kind: 'done'; url: string; copied: boolean }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' })

  if (!id || disabled) return null

  const make = async () => {
    setState({ kind: 'busy' })
    try {
      const response = await fetch(`${config.routes.api}/customers/${id}/login-link`, {
        method: 'POST',
        credentials: 'include',
      })
      const result = (await response.json()) as { ok: boolean; url?: string; error?: string }
      if (!result.ok || !result.url) throw new Error(result.error || `Error ${response.status}`)
      const copied = await navigator.clipboard
        .writeText(result.url)
        .then(() => true)
        .catch(() => false)
      setState({ kind: 'done', url: result.url, copied })
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <Button buttonStyle="secondary" disabled={state.kind === 'busy'} onClick={make}>
        {state.kind === 'busy' ? 'Making link…' : 'Copy WhatsApp sign-in link'}
      </Button>
      {state.kind === 'done' && (
        <>
          <p style={{ margin: '0 0 0.5rem' }}>
            {state.copied ? 'Copied. ' : ''}Send it to the client on WhatsApp. It works once, within
            24 hours.
          </p>
          <input
            readOnly
            value={state.url}
            onFocus={(event) => event.currentTarget.select()}
            style={{ width: '100%', direction: 'ltr', fontSize: '12px' }}
          />
        </>
      )}
      {state.kind === 'error' && (
        <p style={{ margin: 0, color: 'var(--theme-error-500)' }}>{state.message}</p>
      )}
    </div>
  )
}
