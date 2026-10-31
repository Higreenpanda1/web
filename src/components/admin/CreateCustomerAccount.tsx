'use client'
import React, { useState } from 'react'
import { Button, useConfig, useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
export function CreateCustomerAccount() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!id) return null
  return <div style={{ marginBottom: 24 }}>
    <Button disabled={busy} onClick={async () => {
      setBusy(true); setError('')
      try {
        const response = await fetch(`${config.routes.api}/applications/${id}/customer-account`, { method: 'POST', credentials: 'include' })
        const result = await response.json()
        if (!response.ok || !result.id) throw new Error(result.error || 'تعذر إنشاء الحساب')
        router.push(`${config.routes.admin}/collections/customers/${result.id}`)
      } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إنشاء الحساب'); setBusy(false) }
    }}>{busy ? 'جارٍ فتح الحساب…' : 'إنشاء / فتح حساب العميل'}</Button>
    {error && <p role="alert">{error}</p>}
  </div>
}
