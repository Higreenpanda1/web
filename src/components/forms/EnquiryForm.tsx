'use client'

import { AlertCircle, CheckCircle2, Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useId, useRef } from 'react'
import { useFormStatus } from 'react-dom'

import { submitEnquiry, type EnquiryState } from '@/app/actions/enquiry'
import { Button } from '@/components/ui/Button'
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/form-fields'
import { countryName, OTHER_COUNTRIES, PRIORITY_COUNTRIES } from '@/lib/countries'

import type { Locale } from '@/i18n/routing'

type ServiceOption = { id: number; title: string }

const initialState: EnquiryState = { status: 'idle' }

/**
 * The enquiry form.
 *
 * It is a real <form> posting to a server action, so it works without
 * JavaScript and before hydration — which on a mid-range Android over 4G is
 * most of the time a visitor spends on the page. Validation errors and the
 * success state are server-rendered for the same reason.
 *
 * Accessibility: every field has a real <label>, errors are tied to their
 * input with aria-describedby and announced through a live region, and the
 * whole thing is reachable and submittable from the keyboard alone.
 */
export function EnquiryForm({
  locale,
  services,
  formToken,
  compact = false,
}: {
  locale: Locale
  services: ServiceOption[]
  formToken: string
  compact?: boolean
}) {
  const t = useTranslations('contact.form')
  const [state, formAction] = useActionState(submitEnquiry, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const ids = useId()

  const fieldId = (name: string) => `${ids}-${name}`
  const errorId = (name: string) => `${ids}-${name}-error`
  const fieldError = (name: string) =>
    state.status === 'error' ? state.fieldErrors?.[name] : undefined

  if (state.status === 'success') {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-lg)] border border-[var(--brand-300)] bg-[var(--brand-100)] p-8 text-[var(--brand-900)]"
      >
        <CheckCircle2
          size={36}
          strokeWidth={1.5}
          aria-hidden="true"
          className="mb-3 text-[var(--brand-700)]"
        />
        <h3 className="text-h3 text-[var(--brand-900)]">{t('successTitle')}</h3>
        <p className="mt-2">{t('successBody', { reference: state.reference })}</p>
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() => {
            formRef.current?.reset()
            window.location.reload()
          }}
        >
          {t('successAgain')}
        </Button>
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name={TIMESTAMP_FIELD} value={formToken} />

      {/* Honeypot. Hidden from sight and from screen readers, skipped by the
          keyboard, and never autofilled — so only a bot fills it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={fieldId(HONEYPOT_FIELD)}>Leave this field empty</label>
        <input
          id={fieldId(HONEYPOT_FIELD)}
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div aria-live="polite">
        {state.status === 'error' && !state.fieldErrors ? (
          <p className="flex items-start gap-2 rounded-[var(--radius)] border border-[var(--error)] bg-[var(--error)]/10 p-3 text-[var(--error)]">
            <AlertCircle
              size={20}
              strokeWidth={1.5}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            <span>{t(`errors.${state.errorKey}` as 'errors.generic')}</span>
          </p>
        ) : null}
      </div>

      <div className={compact ? 'space-y-5' : 'grid gap-5 sm:grid-cols-2'}>
        <Field
          id={fieldId('name')}
          name="name"
          label={t('name')}
          placeholder={t('namePlaceholder')}
          autoComplete="name"
          required
          error={fieldError('name')}
          errorId={errorId('name')}
        />

        <div>
          <Label htmlFor={fieldId('country')} required>
            {t('country')}
          </Label>
          <select
            id={fieldId('country')}
            name="country"
            required
            defaultValue=""
            aria-describedby={fieldError('country') ? errorId('country') : undefined}
            aria-invalid={fieldError('country') ? true : undefined}
            className={inputClass(Boolean(fieldError('country')))}
          >
            <option value="" disabled>
              {t('countryPlaceholder')}
            </option>
            {PRIORITY_COUNTRIES.map((country) => (
              <option key={country.code} value={countryName(country, locale)}>
                {countryName(country, locale)}
              </option>
            ))}
            <option disabled>──────────</option>
            {OTHER_COUNTRIES.map((country) => (
              <option key={country.code} value={countryName(country, locale)}>
                {countryName(country, locale)}
              </option>
            ))}
          </select>
          <FieldError id={errorId('country')} messageKey={fieldError('country')} />
        </div>
      </div>

      <Field
        id={fieldId('whatsapp')}
        name="whatsapp"
        label={t('whatsapp')}
        hint={t('whatsappHint')}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        dir="ltr"
        required
        error={fieldError('whatsapp')}
        errorId={errorId('whatsapp')}
      />

      <div>
        <Label htmlFor={fieldId('service')}>{t('service')}</Label>
        <select
          id={fieldId('service')}
          name="service"
          defaultValue=""
          className={inputClass(false)}
        >
          <option value="">{t('servicePlaceholder')}</option>
          {services.map((service) => (
            <option key={service.id} value={String(service.id)}>
              {service.title}
            </option>
          ))}
          <option value="other">{t('serviceOther')}</option>
        </select>
      </div>

      <div>
        <Label htmlFor={fieldId('message')} required>
          {t('message')}
        </Label>
        <textarea
          id={fieldId('message')}
          name="message"
          rows={6}
          required
          placeholder={t('messagePlaceholder')}
          aria-describedby={fieldError('message') ? errorId('message') : undefined}
          aria-invalid={fieldError('message') ? true : undefined}
          className={inputClass(Boolean(fieldError('message')))}
        />
        <FieldError id={errorId('message')} messageKey={fieldError('message')} />
      </div>

      <p className="text-caption text-[var(--text-muted)]">{t('consent')}</p>

      <SubmitButton idle={t('submit')} busy={t('submitting')} />
    </form>
  )
}

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Send size={20} strokeWidth={1.5} aria-hidden="true" className="rtl:-scale-x-100" />
      {pending ? busy : idle}
    </Button>
  )
}

function Field({
  id,
  name,
  label,
  hint,
  error,
  errorId,
  required,
  ...rest
}: {
  id: string
  name: string
  label: string
  hint?: string
  error?: string
  errorId: string
  required?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const hintId = `${id}-hint`
  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {hint ? (
        <p id={hintId} className="ltr-nums mb-1.5 text-caption text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        name={name}
        required={required}
        aria-describedby={
          [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
        }
        aria-invalid={error ? true : undefined}
        className={inputClass(Boolean(error))}
        {...rest}
      />
      <FieldError id={errorId} messageKey={error} />
    </div>
  )
}

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-semibold text-[var(--text)]">
      {children}
      {required ? (
        <span className="text-[var(--error)]" aria-hidden="true">
          {' '}
          *
        </span>
      ) : null}
    </label>
  )
}

function FieldError({ id, messageKey }: { id: string; messageKey?: string }) {
  const t = useTranslations('contact.form.errors')
  if (!messageKey) return null
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-caption text-[var(--error)]"
    >
      <AlertCircle size={16} strokeWidth={1.5} aria-hidden="true" />
      {t(messageKey as 'generic')}
    </p>
  )
}

function inputClass(hasError: boolean): string {
  return [
    'w-full rounded-[var(--radius)] border bg-[var(--surface)] px-3.5 py-3 text-body text-[var(--text)]',
    'min-h-12 transition-colors placeholder:text-[var(--text-muted)]',
    hasError ? 'border-[var(--error)]' : 'border-[var(--border-strong)]',
  ].join(' ')
}
