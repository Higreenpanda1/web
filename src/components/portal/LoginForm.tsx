'use client'

import { useActionState } from 'react'

import { FieldError, FormAlert, Label, inputClass } from '@/components/forms/fields'
import { Button } from '@/components/ui/Button'
import { portalLogin, type LoginState } from '@/app/actions/portal'

import { useFormStatus } from 'react-dom'

type Copy = {
  email: string
  send: string
  sending: string
  sent: string
  code: string
  signIn: string
  signingIn: string
  resend: string
  resent: string
  otherEmail: string
  errors: Record<'wrong' | 'expired' | 'tooMany' | 'email', string>
}

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? busy : idle}
    </Button>
  )
}

/**
 * Two steps on one page: the email, then the code that was sent to it. The
 * second step keeps the email in a hidden field, so "Send again" and the code
 * both go back to the same address.
 */
export function LoginForm({ locale, copy }: { locale: 'ar' | 'en'; copy: Copy }) {
  const [state, action] = useActionState<LoginState, FormData>(portalLogin, { step: 'email' })

  if (state.step === 'email') {
    return (
      <form action={action} className="space-y-5" noValidate>
        <input type="hidden" name="locale" value={locale} />
        {state.error === 'tooMany' ? <FormAlert>{copy.errors.tooMany}</FormAlert> : null}
        <div>
          <Label htmlFor="portal-email">{copy.email}</Label>
          <input
            id="portal-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            required
            aria-invalid={state.error === 'email' || undefined}
            aria-describedby={state.error === 'email' ? 'portal-email-error' : undefined}
            className={inputClass(state.error === 'email')}
          />
          <FieldError
            id="portal-email-error"
            message={state.error === 'email' ? copy.errors.email : undefined}
          />
        </div>
        <Submit idle={copy.send} busy={copy.sending} />
      </form>
    )
  }

  const error = state.error ? copy.errors[state.error] : undefined
  const [before, after = ''] = copy.sent.split('{email}')
  return (
    <div className="space-y-5">
      <p className="rounded-[var(--radius)] bg-surface-tint-soft p-3 text-text">
        {state.resent ? `${copy.resent} ` : null}
        {before}
        <span className="ltr-nums font-semibold">{state.email}</span>
        {after}
      </p>
      <form action={action} className="space-y-5" noValidate>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="email" value={state.email} />
        <div>
          <Label htmlFor="portal-code">{copy.code}</Label>
          <input
            id="portal-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={12}
            dir="ltr"
            required
            autoFocus
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? 'portal-code-error' : undefined}
            className={`${inputClass(Boolean(error))} text-center text-h3 tracking-[0.4em]`}
          />
          <FieldError id="portal-code-error" message={error} />
        </div>
        <Submit idle={copy.signIn} busy={copy.signingIn} />
      </form>
      <form action={action} className="flex flex-wrap items-center justify-between gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="resend" value="1" />
        <button type="submit" className="text-text-brand underline underline-offset-4">
          {copy.resend}
        </button>
        <a href="" className="text-text-muted underline underline-offset-4">
          {copy.otherEmail}
        </a>
      </form>
    </div>
  )
}
