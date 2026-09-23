'use client'

import { AlertCircle, Send } from 'lucide-react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'

import type { ReactNode } from 'react'

/**
 * The pieces every form on the site shares — label, error line, input
 * styling, submit button — so the enquiry form and the application forms
 * cannot drift apart in the details a visitor actually notices: where the
 * asterisk sits, how an error reads, how tall a field is on a phone.
 *
 * Colours are raw CSS variables rather than Tailwind utilities on purpose:
 * these render inside client components that may be mounted in a CMS block,
 * and the variables follow the theme wherever the block lands.
 */

export function Label({
  htmlFor,
  children,
  required,
  optionalLabel,
}: {
  htmlFor: string
  children: ReactNode
  required?: boolean
  /** Shown after the label when the field is optional, e.g. "(optional)". */
  optionalLabel?: string
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-semibold text-[var(--text)]">
      {children}
      {required ? (
        <span className="text-[var(--error)]" aria-hidden="true">
          {' '}
          *
        </span>
      ) : optionalLabel ? (
        <span className="font-normal text-[var(--text-muted)]"> ({optionalLabel})</span>
      ) : null}
    </label>
  )
}

export function Hint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mb-1.5 text-caption text-[var(--text-muted)]">
      {children}
    </p>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-caption text-[var(--error)]"
    >
      <AlertCircle size={16} strokeWidth={1.5} aria-hidden="true" />
      {message}
    </p>
  )
}

export function inputClass(hasError: boolean): string {
  return [
    'w-full rounded-[var(--radius)] border bg-[var(--surface)] px-3.5 py-3 text-body text-[var(--text)]',
    'min-h-12 transition-colors placeholder:text-[var(--text-muted)]',
    hasError ? 'border-[var(--error)]' : 'border-[var(--border-strong)]',
  ].join(' ')
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-[var(--radius)] border border-[var(--error)] bg-[var(--error)]/10 p-3 text-[var(--error)]">
      <AlertCircle size={20} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Send size={20} strokeWidth={1.5} aria-hidden="true" className="rtl:-scale-x-100" />
      {pending ? busy : idle}
    </Button>
  )
}
