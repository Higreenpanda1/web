'use client'

import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useRef } from 'react'

import { submitEnquiry, type EnquiryState } from '@/app/actions/enquiry'
import { Button } from '@/components/ui/Button'
import { FieldError, FormAlert, Hint, inputClass, Label, SubmitButton } from './fields'
import { trackEvent } from '@/lib/analytics-events'
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
  defaultService,
}: {
  locale: Locale
  services: ServiceOption[]
  formToken: string
  compact?: boolean
  defaultService?: number
}) {
  const t = useTranslations('contact.form')
  const [state, formAction] = useActionState(submitEnquiry, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const ids = useId()

  const fieldId = (name: string) => `${ids}-${name}`
  const errorId = (name: string) => `${ids}-${name}-error`
  const fieldError = (name: string) =>
    state.status === 'error' ? state.fieldErrors?.[name] : undefined
  const errorMessage = (key?: string) => (key ? t(`errors.${key}` as 'errors.generic') : undefined)

  // The conversion event, once per successful send. `status` is the dependency,
  // not `state`, so a re-render with the same result does not count twice.
  useEffect(() => {
    if (state.status === 'success')
      trackEvent('enquiry_sent', { form: compact ? 'compact' : 'full' })
  }, [state.status, compact])

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
          <FormAlert>{t(`errors.${state.errorKey}` as 'errors.generic')}</FormAlert>
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
          error={errorMessage(fieldError('name'))}
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
          <FieldError id={errorId('country')} message={errorMessage(fieldError('country'))} />
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
        error={errorMessage(fieldError('whatsapp'))}
        errorId={errorId('whatsapp')}
      />

      <div>
        <Label htmlFor={fieldId('service')}>{t('service')}</Label>
        <select
          id={fieldId('service')}
          name="service"
          defaultValue={defaultService ? String(defaultService) : ''}
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
        <FieldError id={errorId('message')} message={errorMessage(fieldError('message'))} />
      </div>

      <p className="text-caption text-[var(--text-muted)]">{t('consent')}</p>

      <SubmitButton idle={t('submit')} busy={t('submitting')} />
    </form>
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
        <Hint id={hintId}>
          <span className="ltr-nums">{hint}</span>
        </Hint>
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
      <FieldError id={errorId} message={error} />
    </div>
  )
}
