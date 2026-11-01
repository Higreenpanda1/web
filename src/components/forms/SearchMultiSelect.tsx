'use client'
import { useState } from 'react'
export function SearchMultiSelect({
  id,
  invalid,
  describedBy,
  name,
  label,
  options,
  disabled,
  searchLabel,
  onChange,
  defaultValue = [],
}: {
  id: string
  invalid?: boolean
  describedBy?: string
  name: string
  label: string
  options: { value: string; label: string }[]
  disabled: boolean
  searchLabel: string
  onChange?: (values: string[]) => void
  defaultValue?: string[]
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(defaultValue)
  const toggle = (value: string, checked: boolean) => {
    const next = checked ? [...selected, value] : selected.filter((v) => v !== value)
    setSelected(next)
    onChange?.(next)
  }
  return (
    <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} disabled={disabled} />
      ))}
      <div className="mb-2 flex flex-wrap gap-2">
        {selected.map((value) => (
          <button
            key={value}
            type="button"
            className="rounded-full border border-[var(--border-strong)] px-3 py-2"
            onClick={() => toggle(value, false)}
          >
            {options.find((o) => o.value === value)?.label} ×
          </button>
        ))}
      </div>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={searchLabel}
        placeholder={searchLabel}
        className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-3"
      />
      <div className="mt-2 grid max-h-64 gap-2 overflow-auto rounded-xl border border-[var(--border-strong)] p-3 sm:grid-cols-2">
        {options
          .filter((o) => o.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
          .map((o) => (
            <label key={o.value} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={(e) => toggle(o.value, e.target.checked)}
              />
              {o.label}
            </label>
          ))}
      </div>
    </fieldset>
  )
}
