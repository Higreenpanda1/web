'use client'

import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import {
  ANOTHER_COUNTRY,
  countryName,
  OTHER_COUNTRIES,
  PRIORITY_COUNTRIES,
  searchCountries,
  type Country,
} from '@/lib/countries'

import { COUNTRY_CHOSEN_EVENT, type CountryChosenDetail } from './PhoneInput'

import type { Locale } from '@/i18n/routing'

/**
 * Every country / nationality / country-of-residence field on the site.
 *
 * Before hydration (and without JavaScript) it is the plain <select> it always
 * was, so the forms keep working on a slow phone. Once React is running it
 * becomes a type-to-search box: the visitor types "يمن" or "Yemen" and picks
 * from the matches instead of scrolling a long list. Either way the form posts
 * the same value under the same name — the country's name in the page language.
 */
export function CountrySelect({
  id,
  name,
  locale,
  placeholder,
  required,
  disabled,
  defaultValue,
  className,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: {
  id: string
  name: string
  locale: Locale
  /** First option of the no-JavaScript <select>. */
  placeholder: string
  required?: boolean
  disabled?: boolean
  defaultValue?: string
  className: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}) {
  const t = useTranslations('countrySelect')
  const tErrors = useTranslations('contact.form.errors')
  const [enhanced, setEnhanced] = useState(false)
  useEffect(() => setEnhanced(true), [])

  if (!enhanced) {
    return (
      <select
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue ?? ''}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className={className}
      >
        <option value="" disabled={required}>
          {placeholder}
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
  }

  return (
    <CountryCombobox
      id={id}
      name={name}
      locale={locale}
      required={required}
      disabled={disabled}
      defaultValue={defaultValue}
      className={className}
      describedBy={describedBy}
      invalid={invalid}
      searchPlaceholder={t('placeholder')}
      noResults={t('noResults')}
      requiredMessage={tErrors('countryRequired')}
    />
  )
}

function CountryCombobox({
  id,
  name,
  locale,
  required,
  disabled,
  defaultValue,
  className,
  describedBy,
  invalid,
  searchPlaceholder,
  noResults,
  requiredMessage,
}: {
  id: string
  name: string
  locale: Locale
  required?: boolean
  disabled?: boolean
  defaultValue?: string
  className: string
  describedBy?: string
  invalid?: boolean
  searchPlaceholder: string
  noResults: string
  requiredMessage: string
}) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [value, setValue] = useState(defaultValue ?? '')
  const [query, setQuery] = useState(defaultValue ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  // While the box shows the chosen country, opening it lists everything again.
  const searching = query.trim() !== '' && query !== value
  const matches = useMemo(() => (searching ? searchCountries(query) : []), [searching, query])
  // A search always ends with "another country", so nobody is left without a choice.
  const groups: Country[][] = !searching
    ? [PRIORITY_COUNTRIES, OTHER_COUNTRIES]
    : matches.includes(ANOTHER_COUNTRY)
      ? [matches]
      : [matches, [ANOTHER_COUNTRY]].filter((group) => group.length > 0)
  const options = groups.flat()

  // Typed text that is not a chosen country must not pass as an answer.
  useEffect(() => {
    inputRef.current?.setCustomValidity(query.trim() !== '' && !value ? requiredMessage : '')
  }, [query, value, requiredMessage])

  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  // Tells the WhatsApp code box in the same form which country this is.
  const announce = (country: Country) => {
    inputRef.current?.dispatchEvent(
      new CustomEvent<CountryChosenDetail>(COUNTRY_CHOSEN_EVENT, {
        bubbles: true,
        detail: { name, code: country.code },
      }),
    )
  }

  const choose = (country: Country) => {
    const label = countryName(country, locale)
    setValue(label)
    setQuery(label)
    setOpen(false)
    announce(country)
  }

  const optionId = (index: number) => `${listId}-${index}`
  let index = -1

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} disabled={disabled} />
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        enterKeyHint="search"
        spellCheck={false}
        required={required}
        disabled={disabled}
        placeholder={searchPlaceholder}
        value={query}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options.length > 0 ? optionId(active) : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className={cn(className, 'pe-10')}
        onFocus={(event) => {
          event.currentTarget.select()
          setOpen(true)
        }}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          const next = event.target.value
          setQuery(next)
          // An exact name counts as a choice; anything else clears the old one.
          const exact = searchCountries(next).find(
            (country) => countryName(country, locale) === next.trim(),
          )
          setValue(exact ? countryName(exact, locale) : '')
          if (exact) announce(exact)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) return setOpen(true)
            const step = event.key === 'ArrowDown' ? 1 : -1
            setActive((current) => (current + step + options.length) % Math.max(options.length, 1))
          } else if (event.key === 'Enter' && open) {
            // Pick the highlighted country rather than submitting the form.
            event.preventDefault()
            const country = options[active]
            if (country) choose(country)
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            setOpen(false)
          }
        }}
      />
      <ChevronDown
        size={18}
        strokeWidth={1.5}
        aria-hidden="true"
        className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        hidden={!open}
        className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] py-1 shadow-lg"
      >
        {searching && matches.length === 0 ? (
          <li role="presentation" className="px-3.5 py-2.5 text-[var(--text-muted)]">
            {noResults}
          </li>
        ) : null}
        {groups.map((group, groupIndex) => [
          groupIndex > 0 ? (
            <li
              key={`separator-${groupIndex}`}
              role="separator"
              className="mx-3.5 my-1 border-t border-[var(--border)]"
            />
          ) : null,
          ...group.map((country) => {
            index += 1
            const current = index
            const label = countryName(country, locale)
            return (
              <li
                key={country.code}
                id={optionId(current)}
                data-index={current}
                role="option"
                aria-selected={label === value}
                // Keep focus in the box so the tap lands before blur closes the list.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(country)}
                onMouseMove={() => setActive(current)}
                className={cn(
                  'cursor-pointer px-3.5 py-2.5 text-[var(--text)]',
                  current === active && 'bg-[var(--surface-tint)]',
                  label === value && 'font-semibold text-[var(--text-brand)]',
                )}
              >
                {label}
              </li>
            )
          }),
        ])}
      </ul>
    </div>
  )
}
