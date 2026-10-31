import { billLines, billSums, type BillingItem, type Payment } from './billing.ts'

export type PaymentBilling = {
  items?: BillingItem[] | null
  payments?: Payment[] | null
  depositPlan?: string | null
  customDeposit?: number | null
  paidFull?: string | null
  clientCompany?: string | null
}

/** One canonical snapshot for checking that the staff member saved the form first. */
export function paymentSyncVersion(billing: PaymentBilling | null | undefined): string {
  return JSON.stringify({
    lines: billLines(billing?.items ?? []),
    payments: (billing?.payments ?? []).map((p) => ({
      id: p.id ?? '',
      amount: p.amount,
      paidOn: p.paidOn,
      method: p.method,
      receivedBy: p.receivedBy,
      reference: p.reference || '',
    })),
    plan: billing?.depositPlan || '50',
    custom: billing?.customDeposit ?? null,
    full: billing?.paidFull || '',
    company: billing?.clientCompany || '',
  })
}

const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
export const paymentMarker = (reference: string) => `HGP-PAYMENTS:${reference}`

export function confirmedPaymentNote(
  application: {
    reference: string
    name: string
    email?: string | null
    whatsapp: string
    country: string
    billing?: PaymentBilling | null
  },
  confirmedBy: string,
): string {
  const billing = application.billing
  const payments = billing?.payments ?? []
  if (!payments.length) throw new Error('سجّل المبلغ المستلم واحفظ الطلب أولاً.')
  for (const p of payments) {
    if (
      !p.id ||
      !Number.isFinite(p.amount) ||
      p.amount <= 0 ||
      Math.abs(p.amount * 100 - Math.round(p.amount * 100)) > 0.00001 ||
      !p.paidOn ||
      !Number.isFinite(Date.parse(p.paidOn)) ||
      !p.receivedBy?.trim() ||
      !['cash', 'bank', 'wechat', 'alipay', 'other'].includes(p.method)
    ) {
      throw new Error('أكمل بيانات جميع الدفعات واحفظها أولاً.')
    }
  }
  const lines = billLines(billing?.items ?? [])
  if (!lines.length) throw new Error('أضف الخدمات وأسعارها واحفظ الطلب أولاً.')
  const received = payments.reduce((sum, p) => sum + Math.round(p.amount * 100), 0) / 100
  const sums = billSums(lines, {
    received,
    fullDiscount: billing?.depositPlan === 'full' || Boolean(billing?.paidFull),
  })
  const total = billing?.depositPlan === 'full' || billing?.paidFull ? sums.full : sums.total
  const amount = (n: number) =>
    `CNY ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const methods = {
    cash: 'Cash / 现金',
    bank: 'Bank transfer / 银行转账',
    wechat: 'WeChat Pay / 微信支付',
    alipay: 'Alipay / 支付宝',
    other: 'Other / 其他',
  }
  return `<p>${escape(paymentMarker(application.reference))}</p><h2>Confirmed payments / 已确认收款</h2>
<p>Request / 申请: ${escape(application.reference)}<br>Client / 客户: ${escape(application.name)}<br>Company / 公司: ${escape(billing?.clientCompany)}<br>Email: ${escape(application.email)}<br>WhatsApp: ${escape(application.whatsapp)}<br>Country / 国家: ${escape(application.country)}</p>
<p>Total payable / 应付总额: ${amount(total)}<br>Total received / 累计已收: ${amount(received)}<br>Remaining / 剩余应付: ${amount(sums.balance)}${received > total ? `<br>Credit / 多付余额: ${amount(received - total)}` : ''}<br>Status / 状态: ${received >= total ? 'Paid in full / 已全额付款' : 'Partially paid / 部分付款'}</p>
<ul>${payments.map((p) => `<li>${escape(p.id)}: ${amount(p.amount)} · ${methods[p.method]} · ${escape(p.paidOn)} · Received by / 收款人: ${escape(p.receivedBy)}${p.reference ? ` · ${escape(p.reference)}` : ''}</li>`).join('')}</ul>
<h3>Services / 服务</h3><ul>${lines.map((l) => `<li>${escape(l.en)} ${escape(l.zh)} · ${l.quantity} × ${amount(l.unitPrice)}${l.description ? ` · ${escape(l.description)}` : ''}</li>`).join('')}</ul>
<p>Receipt confirmed by / 收款确认人: ${escape(confirmedBy)}</p>`
}
