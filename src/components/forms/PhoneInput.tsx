'use client'

import { ChevronDown, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { normalizeCountryText, PRIORITY_COUNTRIES } from '@/lib/countries'
import {
  DEFAULT_DIAL_COUNTRY,
  DIAL_COUNTRIES,
  dialCountry,
  type DialCountry,
} from '@/lib/dial-codes'
import { asciiDigits, codeFieldName } from '@/lib/phone'

import type { Locale } from '@/i18n/routing'

/** Fired by CountrySelect when a country is chosen, so the code box can follow it. */
export const COUNTRY_CHOSEN_EVENT = 'hgp-country-chosen'
export type CountryChosenDetail = { name: string; code: string }

/**
 * Every WhatsApp number on the site: a country-code box, then the number.
 *
 * Visitors rarely type their country code on their own, and without it the
 * "Reply on WhatsApp" button in the notification email opens the wrong number
 * or none. So the code is its own box, starting on the country picked in the
 * form's country field (Saudi Arabia until one is picked) and searchable by
 * name in either language. The box posts the country's ISO code under
 * `<name>Code`; the server joins it to the number (src/lib/phone.ts), and a
 * number typed in full with + or 00 is kept as typed.
 *
 * Before hydration the box is a plain <select>, so the form still works on a
 * slow phone.
 */
export function PhoneInput({
  id,
  name,
  locale,
  required,
  disabled,
  defaultValue,
  invalid,
  describedBy,
  followField = 'country',
}: {
  id: string
  name: string
  locale: Locale
  required?: boolean
  disabled?: boolean
  defaultValue?: string
  invalid?: boolean
  describedBy?: string
  /** The form's country field; the code follows it until the visitor picks one. */
  followField?: string
}) {
  const t = useTranslations('phoneInput')
  const rootRef = useRef<HTMLDivElement>(null)
  const [enhanced, setEnhanced] = useState(false)
  const [code, setCode] = useState(DEFAULT_DIAL_COUNTRY.code)
  const chosenByHand = useRef(false)
  useEffect(() => setEnhanced(true), [])

  const ordered = useMemo(() => orderedCountries(locale), [locale])

  // Follow the country field, unless the visitor chose a code themselves.
  useEffect(() => {
    const form = rootRef.current?.closest('form')
    if (!form) return
    const follow = (country: DialCountry | undefined) => {
      if (country && !chosenByHand.current) setCode(country.code)
    }
    const current = form.elements.namedItem(followField)
    if (current instanceof HTMLInputElement || current instanceof HTMLSelectElement) {
      follow(byName(current.value))
    }
    const onChosen = (event: Event) => {
      const detail = (event as CustomEvent<CountryChosenDetail>).detail
      if (detail?.name === followField) follow(dialCountry(detail.code))
    }
    form.addEventListener(COUNTRY_CHOSEN_EVENT, onChosen)
    return () => form.removeEventListener(COUNTRY_CHOSEN_EVENT, onChosen)
  }, [followField])

  const label = (country: DialCountry) => (locale === 'ar' ? country.ar : country.en)
  const box = (hasError: boolean) =>
    cn(
      'rounded-[var(--radius)] border bg-[var(--surface)] text-body text-[var(--text)] min-h-12 transition-colors',
      hasError ? 'border-[var(--error)]' : 'border-[var(--border-strong)]',
    )

  return (
    <div ref={rootRef} dir="ltr" className="flex gap-2">
      {enhanced ? (
        <CodePicker
          name={codeFieldName(name)}
          value={code}
          countries={ordered}
          label={label}
          disabled={disabled}
          className={box(Boolean(invalid))}
          onChange={(next) => {
            chosenByHand.current = true
            setCode(next)
          }}
          codeLabel={t('codeLabel')}
          searchPlaceholder={t('search')}
          noResults={t('noResults')}
          rtl={locale === 'ar'}
        />
      ) : (
        <select
          name={codeFieldName(name)}
          defaultValue={DEFAULT_DIAL_COUNTRY.code}
          disabled={disabled}
          aria-label={t('codeLabel')}
          className={cn(box(Boolean(invalid)), 'w-32 shrink-0 px-2')}
        >
          {ordered.map((country) => (
            <option key={country.code} value={country.code}>
              {`+${country.dial} ${label(country)}`}
            </option>
          ))}
        </select>
      )}
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required={required}
        disabled={disabled}
        defaultValue={defaultValue}
        placeholder={t('example')}
        maxLength={24}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className={cn(
          box(Boolean(invalid)),
          'min-w-0 flex-1 px-3.5 py-3 placeholder:text-[var(--text-muted)]',
        )}
      />
    </div>
  )
}

function CodePicker({
  name,
  value,
  countries,
  label,
  disabled,
  className,
  onChange,
  codeLabel,
  searchPlaceholder,
  noResults,
  rtl,
}: {
  name: string
  value: string
  countries: DialCountry[]
  label: (country: DialCountry) => string
  disabled?: boolean
  className: string
  onChange: (code: string) => void
  codeLabel: string
  searchPlaceholder: string
  noResults: string
  rtl: boolean
}) {
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = dialCountry(value) ?? DEFAULT_DIAL_COUNTRY
  const options = useMemo(() => searchDial(countries, query), [countries, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(Math.max(0, countries.indexOf(selected)))
    searchRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const choose = (country: DialCountry) => {
    onChange(country.code)
    setOpen(false)
    buttonRef.current?.focus()
  }
  const optionId = (index: number) => `${listId}-${index}`

  return (
    <div
      ref={wrapRef}
      className="relative shrink-0"
      onBlur={(event) => {
        if (!wrapRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <input type="hidden" name={name} value={selected.code} disabled={disabled} />
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${codeLabel}: ${label(selected)} +${selected.dial}`}
        title={label(selected)}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          className,
          'flex h-full w-[6.75rem] items-center justify-between gap-1 px-3 font-semibold',
        )}
      >
        <span className="text-caption font-semibold text-[var(--text-muted)]">{selected.code}</span>
        <span>+{selected.dial}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-[var(--text-muted)]"
        />
      </button>
      {open ? (
        <div className="absolute start-0 top-full z-30 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-lg">
          <div className="relative border-b border-[var(--border)] p-2" dir={rtl ? 'rtl' : 'ltr'}>
            <Search
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
              className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              autoComplete="off"
              enterKeyHint="search"
              spellCheck={false}
              aria-label={searchPlaceholder}
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={options.length > 0 ? optionId(active) : undefined}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  const step = event.key === 'ArrowDown' ? 1 : -1
                  setActive(
                    (current) => (current + step + options.length) % Math.max(options.length, 1),
                  )
                } else if (event.key === 'Enter') {
                  // Pick the highlighted country rather than submitting the form.
                  event.preventDefault()
                  const country = options[active]
                  if (country) choose(country)
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  setOpen(false)
                  buttonRef.current?.focus()
                }
              }}
              className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-2 pe-3 ps-9 text-body text-[var(--text)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={codeLabel}
            dir={rtl ? 'rtl' : 'ltr'}
            className="max-h-64 overflow-y-auto py-1"
          >
            {options.length === 0 ? (
              <li role="presentation" className="px-3.5 py-2.5 text-[var(--text-muted)]">
                {noResults}
              </li>
            ) : null}
            {options.map((country, index) => (
              <li
                key={country.code}
                id={optionId(index)}
                data-index={index}
                role="option"
                aria-selected={country.code === selected.code}
                // Keep focus inside so the tap lands before blur closes the list.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(country)}
                onMouseMove={() => setActive(index)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-[var(--text)]',
                  index === active && 'bg-[var(--surface-tint)]',
                  country.code === selected.code && 'font-semibold text-[var(--text-brand)]',
                  !query &&
                    index === PRIORITY_COUNTRIES.length - 1 &&
                    'border-b border-[var(--border)]',
                )}
              >
                <span>{label(country)}</span>
                <span dir="ltr" className="text-[var(--text-muted)]">
                  +{country.dial}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/** The countries this business serves first, in their usual order, then the world A–Z. */
function orderedCountries(locale: Locale): DialCountry[] {
  const first = PRIORITY_COUNTRIES.map((country) => dialCountry(country.code)).filter(
    (country): country is DialCountry => Boolean(country),
  )
  const firstCodes = new Set(first.map((country) => country.code))
  const rest = DIAL_COUNTRIES.filter((country) => !firstCodes.has(country.code)).sort((a, b) =>
    (locale === 'ar' ? a.ar : a.en).localeCompare(locale === 'ar' ? b.ar : b.en, locale),
  )
  return [...first, ...rest]
}

/** By Arabic or English name, or by the code itself: "يمن", "Yemen", "967", "+967". */
function searchDial(countries: DialCountry[], query: string): DialCountry[] {
  const digits = asciiDigits(query).replace(/[\s+]/g, '')
  if (/^\d+$/.test(digits)) return countries.filter((country) => country.dial.startsWith(digits))
  const q = normalizeCountryText(query)
  if (!q) return countries
  const starts: DialCountry[] = []
  const contains: DialCountry[] = []
  for (const country of countries) {
    const names = [country.ar, country.en].map(normalizeCountryText)
    if (names.some((n) => n.startsWith(q) || n.startsWith(`ال${q}`) || n.includes(` ${q}`))) {
      starts.push(country)
    } else if (names.some((n) => n.includes(q))) {
      contains.push(country)
    }
  }
  return [...starts, ...contains]
}

/** The dial country for a name the country field posts, in either language. */
function byName(name: string): DialCountry | undefined {
  const value = name.trim()
  return value ? DIAL_COUNTRIES.find((c) => c.ar === value || c.en === value) : undefined
}
