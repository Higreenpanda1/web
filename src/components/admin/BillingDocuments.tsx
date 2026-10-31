'use client'

import { useConfig, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React from 'react'
import { reduceFieldsToValues } from 'payload/shared'
import { billLines, billSums, type BillingItem, type Payment } from '@/lib/billing'

/**
 * The quote and the three invoices of a HiGP service request, each opened as
 * a printable page (Chinese and English) to save as PDF and send on WhatsApp.
 * They print what is saved, so save after changing the services below.
 */
export function BillingDocuments() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const billing = useFormFields(([fields]) => reduceFieldsToValues(fields, true).billing) as
    | {
        items?: BillingItem[]
        payments?: Payment[]
        depositPlan?: string
        customDeposit?: number
        paidFull?: string
      }
    | undefined
  const payments = Array.isArray(billing?.payments) ? billing.payments : []
  const received =
    Math.round(payments.reduce((sum, payment) => sum + (payment.amount || 0), 0) * 100) / 100
  const sums = billSums(billLines(billing?.items ?? []), {
    received,
    fullDiscount: billing?.depositPlan === 'full' || Boolean(billing?.paidFull),
  })

  if (!id) return null
  const base = `${config.routes.api}/applications/${id}/document`

  const links: Array<[string, string, 'primary' | 'secondary']> = [
    ['Quote', base, 'primary'],
    ['فاتورة الدفعة المختارة / Deposit invoice', `${base}?kind=invoice&stage=deposit`, 'secondary'],
    ['Invoice: balance', `${base}?kind=invoice&stage=balance`, 'secondary'],
    ['Invoice: full (3.5% off)', `${base}?kind=invoice&stage=full`, 'secondary'],
  ]
  for (const [index, payment] of payments.entries()) {
    if (payment.id)
      links.push([
        `إيصال استلام ${index + 1} — CNY ${payment.amount ?? ''}`,
        `${base}?kind=receipt&payment=${encodeURIComponent(payment.id)}`,
        'secondary',
      ])
  }

  return (
    <div>
      <p>احفظ الطلب بعد أي تعديل. الإيصالات تعرض الدفعات المحفوظة فقط.</p>
      {payments.length > 0 && (
        <p>
          المستلم: CNY {received.toLocaleString('en-US')} · المتبقي: CNY{' '}
          {sums.balance.toLocaleString('en-US')}
        </p>
      )}
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
    </div>
  )
}
