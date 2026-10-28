'use client'

import { ArrowLeft, ArrowRight, Check, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { submitApplication, type ApplicationState } from '@/app/actions/application'
import { Button, ButtonLink } from '@/components/ui/Button'
import { errorKey, FORMS, itemFieldName } from '@/forms/definitions'
import { cn } from '@/lib/cn'
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/form-fields'
import { CountrySelect } from './CountrySelect'
import { PhoneInput } from './PhoneInput'
import { FieldError, FormAlert, Hint, inputClass, Label, SubmitButton } from './fields'

import type { FieldDef, RepeatDef, StepDef } from '@/forms/definitions'
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
 *
 * A repeated step (`repeat`, the products of a product request) shows one
 * card per item with add and remove buttons. Without JavaScript it shows the
 * first item only, which is still a complete request.
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
    const index = def.steps.findIndex((s) =>
      s.repeat
        ? Object.keys(fieldErrors).some((key) => key.startsWith(`${s.repeat?.name}.`))
        : s.fields.some((f) => fieldErrors[f.name]),
    )
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

  // A field shown by a field that is itself hidden stays hidden: a hidden
  // control is disabled, so its old answer is never sent to the server.
  const fieldsByName = new Map(def.steps.flatMap((s) => s.fields.map((f) => [f.name, f] as const)))
  const isVisible = (field: FieldDef): boolean => {
    if (!field.showIf) return true
    const controller = fieldsByName.get(field.showIf.field)
    if (controller && !isVisible(controller)) return false
    return field.showIf.in.includes(controls[field.showIf.field] ?? '')
  }

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
          {stepDef.repeat ? (
            <RepeatedItems
              repeat={stepDef.repeat}
              fields={stepDef.fields}
              enhanced={enhanced}
              fieldId={fieldId}
              locale={locale}
              fieldErrors={fieldErrors}
              t={t}
            />
          ) : (
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
          )}
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

/**
 * The items of a repeated step. Each item has a key that never changes while
 * the page is open, so removing product 2 of 3 does not shift the answers of
 * product 3 into its place; the server reads the keys in page order.
 */
function RepeatedItems({
  repeat,
  fields,
  enhanced,
  fieldId,
  locale,
  fieldErrors,
  t,
}: {
  repeat: RepeatDef
  fields: readonly FieldDef[]
  enhanced: boolean
  fieldId: (name: string) => string
  locale: Locale
  fieldErrors: Record<string, string>
  t: T
}) {
  const [keys, setKeys] = useState<number[]>([0])
  const nextKey = useRef(1)
  const listRef = useRef<HTMLOListElement>(null)
  const text = (key: 'item' | 'add' | 'remove' | 'note', values?: { n: number }) =>
    t(`repeat.${repeat.name}.${key}` as 'repeat.products.item', values ?? { n: 0 })

  const add = () => {
    const key = nextKey.current++
    setKeys((current) => [...current, key])
    // Land on the new item's first field, as a visitor expects after "add".
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-item="${key}"] input`)?.focus()
    })
  }

  return (
    <div className="space-y-5">
      <ol ref={listRef} className="m-0 list-none space-y-5 p-0">
        {keys.map((key, position) => {
          const title = text('item', { n: position + 1 })
          return (
            <li
              key={key}
              data-item={key}
              className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 sm:p-6"
            >
              <input type="hidden" name={`${repeat.name}.index`} value={key} />
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="ltr-nums text-body font-semibold text-[var(--heading)]">{title}</h3>
                {enhanced && keys.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${text('remove')} (${title})`}
                    onClick={() => setKeys((current) => current.filter((k) => k !== key))}
                  >
                    <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                    {text('remove')}
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {fields.map((field) => {
                  const name = itemFieldName(repeat, String(key), field.name)
                  const error = fieldErrors[name]
                  return (
                    <div key={field.name} className={cn(field.width !== 'half' && 'sm:col-span-2')}>
                      <FieldControl
                        field={field}
                        name={name}
                        id={fieldId(name)}
                        locale={locale}
                        disabled={false}
                        error={error ? t(`errors.${error}` as 'errors.generic') : undefined}
                        t={t}
                      />
                    </div>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>
      {enhanced ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={add}
            disabled={keys.length >= repeat.max}
          >
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            {text('add')}
          </Button>
          <p className="text-caption text-[var(--text-muted)]">{text('note')}</p>
        </div>
      ) : null}
    </div>
  )
}

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
  name,
  id,
  locale,
  defaultValue,
  disabled,
  error,
  onControlChange,
  t,
}: {
  field: FieldDef
  /** The posted name, when it is not the field's own (a repeated item's). */
  name?: string
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
    name: name ?? field.name,
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
          defaultValue={typeof defaultValue === 'string' ? defaultValue : (field.initial ?? '')}
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
        <CountrySelect
          {...common}
          locale={locale}
          placeholder={t('selectPlaceholder')}
          defaultValue={typeof defaultValue === 'string' ? defaultValue : undefined}
        />
      )
      break
    case 'tel':
      // A Chinese number has a fixed +86; every other number gets a code box.
      if (field.country) {
        control = (
          <input
            {...common}
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete={AUTOCOMPLETE[field.name]}
            maxLength={field.max}
          />
        )
      } else {
        control = (
          <PhoneInput
            id={id}
            name={field.name}
            locale={locale}
            required={field.required}
            disabled={disabled}
            defaultValue={typeof defaultValue === 'string' ? defaultValue : undefined}
            invalid={error ? true : undefined}
            describedBy={describedBy}
          />
        )
      }
      break
    case 'file':
      control = (
        <input
          {...common}
          type="file"
          accept={field.accept?.join(',')}
          multiple={field.multiple ? true : undefined}
          onChange={(event) => {
            const input = event.currentTarget
            // Too many files is told at once, not after the upload.
            input.setCustomValidity(
              field.multiple && (input.files?.length ?? 0) > field.multiple
                ? t(`errors.${errorKey(field, 'tooManyFiles')}` as 'errors.generic')
                : '',
            )
            void shrinkPhotos(input)
          }}
          onInvalid={(event) => {
            // The browser's own "select a file" is in the browser's language;
            // say it in ours, with the field's own words.
            const input = event.currentTarget
            if (input.validity.valueMissing) {
              input.setCustomValidity(
                t(`errors.${errorKey(field, 'required')}` as 'errors.generic'),
              )
            }
          }}
          className={cn(
            inputClass(Boolean(error)),
            'cursor-pointer file:me-3 file:rounded-full file:border-0 file:bg-[var(--surface-tint)] file:px-4 file:py-2 file:font-semibold file:text-[var(--text-brand)]',
          )}
        />
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
        field.kind === 'email' || field.kind === 'url'
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
          inputMode={field.kind === 'number' ? 'decimal' : undefined}
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

/**
 * Phone photos are 3–8 MB; the audience uploads over 4G. A JPEG, PNG or WebP
 * photo larger than this is redrawn at most 2400 px on its long side as a
 * JPEG before it is sent — still sharp enough to read a passport — which
 * also keeps the request well under the server's limits. PDFs, small images,
 * and browsers that cannot do this are left exactly as chosen; the server
 * checks the result either way.
 */
const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024
const MAX_EDGE = 2400

async function shrinkPhotos(input: HTMLInputElement) {
  const files = Array.from(input.files ?? [])
  if (!files.some(needsShrinking)) return
  const transfer = new DataTransfer()
  for (const file of files) transfer.items.add(await shrinkPhoto(file))
  input.files = transfer.files
}

function needsShrinking(file: File): boolean {
  return /^image\/(jpeg|png|webp)$/.test(file.type) && file.size > SHRINK_ABOVE_BYTES
}

async function shrinkPhoto(file: File): Promise<File> {
  if (!needsShrinking(file)) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return file
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Older browsers: send the original; the server enforces the limit.
    return file
  }
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
