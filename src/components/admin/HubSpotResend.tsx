'use client'

import { Button, useConfig, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

/**
 * Sidebar button on an application: sends it to HubSpot again, for a
 * request that came in while HubSpot was down or before the token was set.
 * The server reuses a deal an earlier attempt made, so a second press is
 * harmless.
 */
export function HubSpotResend() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const router = useRouter()
  const synced = useFormFields(([fields]) => fields.hubspotSyncedAt?.value)
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'busy' } | { kind: 'done' } | { kind: 'error'; message: string }
  >({ kind: 'idle' })

  if (!id) return null

  const send = async () => {
    setState({ kind: 'busy' })
    try {
      const response = await fetch(`${config.routes.api}/applications/${id}/hubspot`, {
        method: 'POST',
        credentials: 'include',
      })
      const result = (await response.json()) as { ok: boolean; error?: string }
      if (!result.ok) throw new Error(result.error || `Error ${response.status}`)
      setState({ kind: 'done' })
      router.refresh()
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <Button
        buttonStyle={synced ? 'secondary' : 'primary'}
        disabled={state.kind === 'busy'}
        onClick={send}
      >
        {state.kind === 'busy' ? 'Sending…' : 'Resend to HubSpot'}
      </Button>
      {state.kind === 'done' && <p style={{ margin: 0 }}>Sent to HubSpot.</p>}
      {state.kind === 'error' && (
        <p style={{ margin: 0, color: 'var(--theme-error-500)' }}>{state.message}</p>
      )}
    </div>
  )
}
