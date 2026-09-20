'use client'

import { KeyRound } from 'lucide-react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { signIn, type GateState } from './actions'

const initialState: GateState = {}

export function GateForm({ next, require2FA }: { next: string; require2FA: boolean }) {
  const [state, formAction] = useActionState(signIn, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div aria-live="polite">
        {state.error ? (
          <p
            role="alert"
            className="rounded-[var(--radius)] border border-[var(--error)] bg-[var(--error)]/10 p-3 text-caption text-[var(--error)]"
          >
            {state.error}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="gate-email" className="mb-1.5 block font-semibold">
          Email address
        </label>
        <input
          id="gate-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="gate-password" className="mb-1.5 block font-semibold">
          Password
        </label>
        <input
          id="gate-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={INPUT}
        />
      </div>

      {require2FA ? (
        <div>
          <label htmlFor="gate-code" className="mb-1.5 block font-semibold">
            Authenticator code
          </label>
          <p id="gate-code-hint" className="mb-1.5 text-caption text-[var(--text-muted)]">
            Six digits from your authenticator app, or one of your backup codes.
          </p>
          <input
            id="gate-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-describedby="gate-code-hint"
            required
            className={`${INPUT} tracking-[0.3em]`}
          />
        </div>
      ) : null}

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--brand-700)] px-6 font-semibold text-white transition-colors hover:bg-[var(--brand-800)] disabled:opacity-60"
    >
      <KeyRound size={20} strokeWidth={1.5} aria-hidden="true" />
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  )
}

const INPUT =
  'w-full min-h-12 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-3 text-body text-[var(--text)]'
