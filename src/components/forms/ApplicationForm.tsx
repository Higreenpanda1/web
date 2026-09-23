'use client'

import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { submitApplication, type ApplicationState } from '@/app/actions/application'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FORMS } from '@/forms/definitions'
import { cn } from '@/lib/cn'
import { countryName, OTHER_COUNTRIES, PRIORITY_COUNTRIES } from '@/lib/countries'
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/form-fields'
import { FieldError, FormAlert, Hint, inputClass, Label, SubmitButton } from './fields'

import type { FieldDef, StepDef } from '@/forms/definitions'
import type { Locale } from '@/i18n/routing'
import type { ApplicationType } from '@/lib/catalogue'

const initialState: ApplicationState = { status: 'idle' }

/**
 * One component, nine forms. It renders whatever src/forms/definitions.ts
 * describes, one step at a time once JavaScript is running and all steps at
 * once before it is — so the form is complete and submittable on a slow
 * connection before hydration, and becomes a guided walk-through after.
 *
 * Steps are validated with the browser's own constraint API (`required`,
 * `type`, `min`/`max`) before advancing, so a visitor is told about a
 * missing field on the step where it lives rather than after submitting five
 * steps. The server re-validates everything from the definition regardless.
 *
 * Conditional fields (`showIf`) are disabled while hidden, which keeps them
 * out of both validation and the submitted data.
 */
export function ApplicationForm({
  locale,
  type,
  formToken,
  serviceId,
  defaults = {},
  className,
}: {
  locale: Locale
  type: ApplicationType
  formToken: string
  serviceId?: number | null
  /** Pre-selected answers, e.g. carried over from the cost estimator. */
  defaults?: Record<string, string | string[]>
  className?: string
}) {
  const def = FORMS[type]
  const t = useTranslations('apply')
  const [state, formAction] = useActionState(submitApplication, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const ids = useId()
  const fieldId = (name: string) => `${ids}-${name}`

  // Stepping is an enhancement: before hydration every step is visible.
  const [enhanced, setEnhanced] = useState(false)
  const [step, setStep] = useState(0)
  const [stepError, setStepError] = useState(false)
  // The current value of every field another field depends on.
  const [controls, setControls] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(defaults).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])),
    ),
  )
  useEffect(() => setEnhanced(true), [])

  // A server-side error takes the visitor back to the first step that has one.
  const fieldErrors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}
  useEffect(() => {
    if (state.status !== 'error') return
    const index = def.steps.findIndex((s) => s.fields.some((f) => fieldErrors[f.name]))
    if (index >= 0) setStep(index)
    formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

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
        <h2 className="text-h3 text-[var(--brand-900)]">{t('successTitle')}</h2>
        <p className="mt-2">{t('successBody', { reference: state.reference })}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/services" variant="secondary">
            {t('backToServices')}
          </ButtonLink>
          <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
            {t('successAgain')}
          </Button>
        </div>
      </div>
    )
  }

  const isVisible = (field: FieldDef) =>
    !field.showIf || field.showIf.in.includes(controls[field.showIf.field] ?? '')

  const controllers = new Set(
    def.steps.flatMap((s) => s.fields.flatMap((f) => (f.showIf ? [f.showIf.field] : []))),
  )

  const goNext = () => {
    const fieldset = formRef.current?.querySelector<HTMLFieldSetElement>(`[data-step="${step}"]`)
    if (!fieldset) return
    const inputs = Array.from(
      fieldset.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input, select, textarea',
      ),
    )
    const invalid = inputs.find((input) => !input.disabled && !input.checkValidity())
    // A required checkbox group has no native "at least one" constraint, so
    // check it by hand and land the focus on its first box.
    const emptyGroup = def.steps[step]?.fields.find(
      (field) =>
        field.kind === 'checkboxes' &&
        field.required &&
        isVisible(field) &&
        !inputs.some((input) => input.name === field.name && (input as HTMLInputElement).checked),
    )
    if (invalid || emptyGroup) {
      setStepError(true)
      if (invalid) {
        invalid.reportValidity()
        invalid.focus()
      } else {
        inputs.find((input) => input.name === emptyGroup?.name)?.focus()
      }
      return
    }
    setStepError(false)
    setStep((current) => Math.min(current + 1, def.steps.length - 1))
    formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const last = step === def.steps.length - 1
  const Forward = locale === 'ar' ? ArrowLeft : ArrowRight
  const Backward = locale === 'ar' ? ArrowRight : ArrowLeft

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate={!enhanced ? false : undefined}
      className={cn('scroll-mt-28 space-y-8', className)}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="type" value={type} />
      {serviceId ? <input type="hidden" name="service" value={serviceId} /> : null}
      <input type="hidden" name={TIMESTAMP_FIELD} value={formToken} />
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

      {enhanced ? <Progress steps={def.steps} current={step} t={t} /> : null}

      <div aria-live="polite">
        {state.status === 'error' && !Object.keys(fieldErrors).length ? (
          <FormAlert>{t(`errors.${state.errorKey}` as 'errors.generic')}</FormAlert>
        ) : stepError ? (
          <FormAlert>{t('errors.stepIncomplete')}</FormAlert>
        ) : null}
      </div>

      {def.steps.map((stepDef, index) => (
        <fieldset
          key={stepDef.key}
          data-step={index}
          hidden={enhanced && index !== step}
          className="m-0 min-w-0 border-0 p-0"
        >
          <legend className="mb-5 text-h3 text-[var(--heading)]">
            {enhanced ? null : (
              <span className="ltr-nums me-2 text-[var(--text-brand)]">{index + 1}.</span>
            )}
            {t(`steps.${stepDef.key}`)}
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            {stepDef.fields.map((field) => {
              const visible = isVisible(field)
              return (
                <div
                  key={field.name}
                  hidden={!visible}
                  className={cn(field.width !== 'half' && 'sm:col-span-2')}
                >
                  <FieldControl
                    field={field}
                    id={fieldId(field.name)}
                    locale={locale}
                    defaultValue={defaults[field.name]}
                    disabled={!visible}
                    error={
                      fieldErrors[field.name]
                        ? t(`errors.${fieldErrors[field.name]}` as 'errors.generic')
                        : undefined
                    }
                    onControlChange={
                      controllers.has(field.name)
                        ? (value) => setControls((c) => ({ ...c, [field.name]: value }))
                        : undefined
                    }
                    t={t}
                  />
                </div>
              )
            })}
          </div>
        </fieldset>
      ))}

      <div className="space-y-4 border-t border-[var(--border-soft)] pt-6">
        {!enhanced || last ? (
          <>
            <p className="text-caption text-[var(--text-muted)]">{t('documentsNote')}</p>
            <p className="text-caption text-[var(--text-muted)]">{t('consent')}</p>
          </>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {enhanced && step > 0 ? (
            <Button type="button" variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
              <Backward size={18} strokeWidth={2} aria-hidden="true" />
              {t('back')}
            </Button>
          ) : null}
          {enhanced && !last ? (
            <Button type="button" size="lg" onClick={goNext}>
              {t('next')}
              <Forward size={18} strokeWidth={2} aria-hidden="true" />
            </Button>
          ) : (
            <SubmitButton idle={t('submit')} busy={t('submitting')} />
          )}
        </div>
      </div>
    </form>
  )
}

type T = ReturnType<typeof useTranslations<'apply'>>

function Progress({ steps, current, t }: { steps: readonly StepDef[]; current: number; t: T }) {
  return (
    <div>
      <p className="ltr-nums text-caption font-semibold text-[var(--text-brand)]">
        {t('stepOf', { current: current + 1, total: steps.length })}
      </p>
      <ol className="mt-2 flex list-none gap-1.5 p-0" aria-hidden="true">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index < current
                ? 'bg-[var(--brand-600)]'
                : index === current
                  ? 'bg-[var(--brand-700)]'
                  : 'bg-[var(--border)]',
            )}
          />
        ))}
      </ol>
    </div>
  )
}

function FieldControl({
  field,
  id,
  locale,
  defaultValue,
  disabled,
  error,
  onControlChange,
  t,
}: {
  field: FieldDef
  id: string
  locale: Locale
  defaultValue?: string | string[]
  disabled: boolean
  error?: string
  onControlChange?: (value: string) => void
  t: T
}) {
  const label = t(`fields.${field.name}` as 'fields.name')
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy =
    [field.hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  const common = {
    id,
    name: field.name,
    required: field.required,
    disabled,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    className: inputClass(Boolean(error)),
  }
  const optionLabel = (code: string) =>
    t.has(`options.${field.name}.${code}`)
      ? t(`options.${field.name}.${code}` as 'options.common.yes')
      : t(`options.common.${code}` as 'options.common.yes')

  let control: React.ReactNode
  switch (field.kind) {
    case 'textarea':
      control = <textarea {...common} rows={field.rows ?? 4} maxLength={field.max} />
      break
    case 'select':
      control = (
        <select
          {...common}
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          onChange={onControlChange ? (e) => onControlChange(e.target.value) : undefined}
        >
          <option value="" disabled={field.required}>
            {t('selectPlaceholder')}
          </option>
          {(field.options ?? []).map((code) => (
            <option key={code} value={code}>
              {optionLabel(code)}
            </option>
          ))}
        </select>
      )
      break
    case 'country':
      control = (
        <select {...common} defaultValue="">
          <option value="" disabled={field.required}>
            {t('selectPlaceholder')}
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
      )
      break
    case 'checkboxes':
      return (
        <fieldset className="m-0 min-w-0 border-0 p-0" disabled={disabled}>
          <legend className="mb-1.5 block font-semibold text-[var(--text)]">
            {label}
            {field.required ? (
              <span className="text-[var(--error)]" aria-hidden="true">
                {' '}
                *
              </span>
            ) : null}
          </legend>
          {field.hint ? (
            <Hint id={hintId}>{t(`fields.${field.name}Hint` as 'fields.whatsappHint')}</Hint>
          ) : null}
          <ul className="flex list-none flex-wrap gap-2 p-0">
            {(field.options ?? []).map((code) => (
              <li key={code}>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 has-[:checked]:border-[var(--brand-700)] has-[:checked]:bg-[var(--surface-tint)] has-[:checked]:text-[var(--text-brand)]">
                  <input
                    type="checkbox"
                    name={field.name}
                    value={code}
                    defaultChecked={Array.isArray(defaultValue) && defaultValue.includes(code)}
                    className="peer sr-only"
                    aria-describedby={describedBy}
                  />
                  <Check
                    size={16}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    className="opacity-0 peer-checked:opacity-100"
                  />
                  <span className="font-medium">{optionLabel(code)}</span>
                </label>
              </li>
            ))}
          </ul>
          <FieldError id={errorId} message={error} />
        </fieldset>
      )
    default: {
      const type =
        field.kind === 'tel' || field.kind === 'email' || field.kind === 'url'
          ? field.kind
          : field.kind === 'number'
            ? 'number'
            : field.kind === 'date'
              ? 'date'
              : 'text'
      const ltr = field.kind !== 'text'
      control = (
        <input
          {...common}
          type={type}
          dir={ltr ? 'ltr' : undefined}
          inputMode={field.kind === 'tel' ? 'tel' : field.kind === 'number' ? 'decimal' : undefined}
          autoComplete={AUTOCOMPLETE[field.name]}
          maxLength={field.kind === 'number' ? undefined : field.max}
          min={field.kind === 'number' ? field.min : undefined}
          max={field.kind === 'number' ? field.max : undefined}
          step={field.kind === 'number' ? 'any' : undefined}
        />
      )
    }
  }

  return (
    <div>
      <Label
        htmlFor={id}
        required={field.required}
        optionalLabel={field.required ? undefined : t('optional')}
      >
        {label}
      </Label>
      {field.hint ? (
        <Hint id={hintId}>
          <span className={field.kind === 'tel' ? 'ltr-nums' : undefined}>
            {t(`fields.${field.name}Hint` as 'fields.whatsappHint')}
          </span>
        </Hint>
      ) : null}
      {control}
      <FieldError id={errorId} message={error} />
    </div>
  )
}

const AUTOCOMPLETE: Record<string, string> = {
  name: 'name',
  whatsapp: 'tel',
  email: 'email',
  fullName: 'name',
  familyName: 'family-name',
  givenNames: 'given-name',
  dateOfBirth: 'bday',
  companyName: 'organization',
  employer: 'organization',
}
