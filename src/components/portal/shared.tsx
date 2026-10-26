import { Check, CircleDot, PauseCircle } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { cn } from '@/lib/cn'

import type { Locale } from '@/i18n/routing'
import type { PortalRequest } from '@/lib/portal/requests'
import type { Progress, Step } from '@/lib/portal/stages'

/**
 * Pieces the portal pages share. The portal is in Arabic and English only
 * (the wording the owner approved); the Chinese site's link lands on the
 * English portal.
 */

export type PortalLocale = 'ar' | 'en'

export function portalLocale(locale: Locale, path: string): PortalLocale {
  if (locale === 'zh') redirect(`/en${path}`)
  return locale
}

type T = Awaited<ReturnType<typeof getTranslations<'portal'>>>

export function requestTitle(t: T, request: PortalRequest, typeTitle: (type: string) => string) {
  const title = request.title
  if (title.kind === 'application') return typeTitle(title.type)
  if (title.kind === 'renewal') return t(`renewal.${title.renewal}`)
  if (title.kind === 'service' && t.has(`services.${title.service}`)) {
    return t(`services.${title.service}` as 'services.consultation')
  }
  return t('other')
}

/** The client-facing name of where a request is now. */
export function statusLabel(
  t: T,
  progress: Progress,
  dueDate: string | null,
  date: (iso: string) => string,
) {
  if (progress.stopped) return t(`steps.${progress.stopped}`)
  const step = progress.steps[progress.current] as Step
  if (step === 'due' && dueDate) return t('steps.dueOn', { date: date(dueDate) })
  return t(`steps.${step}`)
}

export function StatusPill({ progress, label }: { progress: Progress; label: string }) {
  const done = progress.closed && !progress.stopped
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold',
        progress.stopped
          ? 'bg-surface-sunken text-text-muted'
          : done
            ? 'bg-brand-100 text-brand-900'
            : 'bg-[rgb(224_163_46/0.16)] text-[#7a520f]',
      )}
    >
      {progress.stopped ? (
        <PauseCircle size={14} aria-hidden="true" />
      ) : done ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <CircleDot size={14} aria-hidden="true" />
      )}
      {label}
    </span>
  )
}

/** The steps of a request, every finished one ticked. */
export function Stepper({
  progress,
  label,
}: {
  progress: Progress
  label: (step: Step, index: number) => string
}) {
  return (
    <ol className="space-y-0">
      {progress.steps.map((step, index) => {
        const done =
          !progress.stopped &&
          (index < progress.current || (progress.closed && index === progress.current))
        const current = !progress.stopped && !done && index === progress.current
        const last = index === progress.steps.length - 1
        return (
          <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
            {!last ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-8 bottom-0 start-[0.9375rem] w-0.5',
                  done ? 'bg-brand-600' : 'bg-border',
                )}
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-caption font-bold',
                done
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : current
                    ? 'border-accent bg-surface text-accent-text shadow-[0_0_0_4px_rgb(224_163_46/0.18)]'
                    : 'border-border-strong bg-surface text-text-muted',
              )}
            >
              {done ? (
                <Check size={16} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <span className="ltr-nums">{index + 1}</span>
              )}
            </span>
            <span
              className={cn(
                'pt-1',
                done ? 'text-text' : current ? 'font-semibold text-heading' : 'text-text-muted',
              )}
              aria-current={current ? 'step' : undefined}
            >
              {label(step, index)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
