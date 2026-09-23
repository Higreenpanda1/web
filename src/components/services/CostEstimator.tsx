'use client'

import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { ButtonLink } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { formatNumber } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { QUOTE, quoteTotal, type QuoteSelection } from '@/lib/quote'

import type { Locale } from '@/i18n/routing'

/**
 * The instant estimate for a company in China. Five questions, one running
 * total, and a button that opens the application with the same choices
 * pre-filled (as query parameters the form reads as defaults).
 *
 * Built from the owner's quotation-system spec; the spec wanted prices
 * editable in an admin and leads saved even when the form is abandoned. The
 * first is a CMS task for later (prices live in src/lib/quote.ts for now); the
 * second is deliberately not done — a half-filled estimate is not consent to
 * be contacted.
 */
export function CostEstimator({ locale, className }: { locale: Locale; className?: string }) {
  const t = useTranslations('estimator')
  const [sel, setSel] = useState<QuoteSelection>({
    city: 'shenzhen',
    registration: 'inPerson',
    address: 'basic',
    bank: 'inPerson',
    extras: [],
  })
  const { total, hasQuoted } = quoteTotal(sel)
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight
  const yuan = (n: number) => `¥${formatNumber(n, locale)}`

  const applyHref = `/apply/company-registration?service=company-formation&city=${sel.city}&address=${sel.address}&extras=${sel.extras.join(',')}${sel.bank !== 'none' ? ',bank-account' : ''}`

  const toggleExtra = (key: keyof typeof QUOTE.extras) =>
    setSel((s) => ({
      ...s,
      extras: s.extras.includes(key) ? s.extras.filter((k) => k !== key) : [...s.extras, key],
    }))

  return (
    <section
      aria-labelledby="estimator-heading"
      className={cn(
        'rounded-xl border border-border-soft bg-surface p-6 shadow-card md:p-8',
        className,
      )}
    >
      <Eyebrow className="mb-3">{t('eyebrow')}</Eyebrow>
      <h2 id="estimator-heading" className="text-h2">
        {t('title')}
      </h2>
      <p className="mt-2 max-w-[var(--measure)] text-text-muted">{t('lead')}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem] lg:gap-12">
        <div className="space-y-7">
          <Choice
            label={t('city')}
            options={QUOTE.cities.map((c) => ({ value: c, label: t(`options.city.${c}`) }))}
            value={sel.city}
            onChange={(city) => setSel((s) => ({ ...s, city: city as QuoteSelection['city'] }))}
          />
          <Choice
            label={t('registration')}
            options={(
              Object.keys(QUOTE.registration) as Array<keyof typeof QUOTE.registration>
            ).map((k) => ({
              value: k,
              label: t(`options.registration.${k}`),
              price: yuan(QUOTE.registration[k]),
            }))}
            value={sel.registration}
            onChange={(v) =>
              setSel((s) => ({ ...s, registration: v as QuoteSelection['registration'] }))
            }
            stacked
          />
          <Choice
            label={t('address')}
            options={(Object.keys(QUOTE.address) as Array<keyof typeof QUOTE.address>).map((k) => {
              const price = QUOTE.address[k]
              return {
                value: k,
                label: t(`options.address.${k}`),
                price: price === null ? t('quoted') : `${yuan(price)} ${t('perYear')}`,
              }
            })}
            value={sel.address}
            onChange={(v) => setSel((s) => ({ ...s, address: v as QuoteSelection['address'] }))}
            stacked
          />
          <Choice
            label={t('bank')}
            options={(Object.keys(QUOTE.bank) as Array<keyof typeof QUOTE.bank>).map((k) => ({
              value: k,
              label: t(`options.bank.${k}`),
              price: QUOTE.bank[k] ? yuan(QUOTE.bank[k]) : undefined,
            }))}
            value={sel.bank}
            onChange={(v) => setSel((s) => ({ ...s, bank: v as QuoteSelection['bank'] }))}
          />
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2.5 font-semibold text-heading">{t('extras')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(QUOTE.extras) as Array<keyof typeof QUOTE.extras>).map((k) => {
                const on = sel.extras.includes(k)
                return (
                  <label
                    key={k}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors',
                      on
                        ? 'border-brand-600 bg-surface-tint'
                        : 'border-border hover:border-brand-300',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => toggleExtra(k)}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm border',
                        on ? 'border-brand-700 bg-brand-700 text-white' : 'border-border-strong',
                      )}
                    >
                      {on ? <Check size={14} strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{t(`options.extras.${k}`)}</span>
                      <span className="ltr-nums block text-caption text-text-muted">
                        {yuan(QUOTE.extras[k])}
                        {k === 'accounting' ? ` ${t('perYear')}` : ''}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <div className="rounded-xl bg-gradient-deep p-6 text-white">
            <p className="text-caption text-white/60">{t('total')}</p>
            <p
              className="ltr-nums mt-1 text-display leading-none font-bold text-brand-400"
              aria-live="polite"
            >
              {yuan(total)}
              {hasQuoted ? <span className="text-h3 font-semibold text-brand-200"> +</span> : null}
            </p>
            {hasQuoted ? (
              <p className="mt-2 text-caption text-brand-200">
                {t('options.address.physical')}: {t('quoted')}
              </p>
            ) : null}
            <ButtonLink href={applyHref} variant="inverse" size="lg" className="mt-6 w-full">
              {t('cta')}
              <Arrow size={18} strokeWidth={2} aria-hidden="true" />
            </ButtonLink>
          </div>
          <p className="mt-3 text-caption text-text-muted">{t('note')}</p>
        </aside>
      </div>
    </section>
  )
}

function Choice({
  label,
  options,
  value,
  onChange,
  stacked = false,
}: {
  label: string
  options: Array<{ value: string; label: string; price?: string }>
  value: string
  onChange: (value: string) => void
  stacked?: boolean
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2.5 font-semibold text-heading">{label}</legend>
      <div className={cn('flex flex-wrap gap-2', stacked && 'flex-col')}>
        {options.map((option) => {
          const on = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                'inline-flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-2 transition-colors',
                stacked ? 'w-full' : 'rounded-full',
                on
                  ? 'border-brand-600 bg-surface-tint text-heading'
                  : 'border-border hover:border-brand-300',
              )}
            >
              <input
                type="radio"
                name={label}
                value={option.value}
                checked={on}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="font-medium">{option.label}</span>
              {option.price ? (
                <span className="ltr-nums shrink-0 text-caption text-text-muted">
                  {option.price}
                </span>
              ) : null}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
