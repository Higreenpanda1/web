'use client'

import { useEffect, useState } from 'react'
import { PRIORITY_COUNTRIES, OTHER_COUNTRIES, countryName } from '@/lib/countries'
import type { Locale } from '@/i18n/routing'

const countries = [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES]
/** Checkbox country picker works on touch screens without Ctrl/Command selection. */
export function MultiCountrySelect({
  id,
  name,
  locale,
  disabled,
  required,
  defaultValue = [],
  label,
  searchLabel,
  className,
  describedBy,
  invalid,
}: {
  id: string
  name: string
  locale: Locale
  disabled: boolean
  required?: boolean
  defaultValue?: string[]
  label: string
  searchLabel: string
  className: string
  describedBy?: string
  invalid?: boolean
}) {
  const [enhanced, setEnhanced] = useState(false)
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState(defaultValue)
  useEffect(() => setEnhanced(true), [])
  if (!enhanced)
    return (
      <select
        id={id}
        name={name}
        multiple
        size={7}
        disabled={disabled}
        required={required}
        defaultValue={defaultValue}
        className={className}
        aria-describedby={describedBy}
        aria-invalid={invalid}
      >
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {countryName(c, locale)}
          </option>
        ))}
      </select>
    )
  const filtered = countries.filter((c) =>
    `${countryName(c, locale)} ${c.en} ${c.ar} ${c.code}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )
  return (
    <div
      id={id}
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid}
    >
      {chosen.map((code) => (
        <input key={code} type="hidden" name={name} value={code} disabled={disabled} />
      ))}
      <div className="mb-2 flex flex-wrap gap-2">
        {countries
          .filter((c) => chosen.includes(c.code))
          .map((c) => (
            <span
              key={c.code}
              className="rounded-full border border-[var(--border-strong)] px-3 py-1"
            >
              {countryName(c, locale)}
            </span>
          ))}
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        placeholder={searchLabel}
        aria-label={searchLabel}
        className={className}
      />
      <div className="mt-2 grid max-h-56 gap-2 overflow-auto rounded-xl border border-[var(--border-strong)] p-3 sm:grid-cols-2">
        {filtered.map((c) => (
          <label key={c.code} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={chosen.includes(c.code)}
              disabled={disabled}
              onChange={(e) =>
                setChosen((previous) =>
                  e.target.checked
                    ? [...previous, c.code]
                    : previous.filter((code) => code !== c.code),
                )
              }
            />
            <span>{countryName(c, locale)}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
