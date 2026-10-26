'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Label, inputClass } from '@/components/forms/fields'
import { Button } from '@/components/ui/Button'
import { setPortalLanguage } from '@/app/actions/portal'

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {label}
    </Button>
  )
}

/** The one thing a client changes themself: the language their codes and the portal come in. */
export function LanguageForm({
  current,
  pageLocale,
  labels,
}: {
  current: 'ar' | 'en'
  pageLocale: 'ar' | 'en'
  labels: { language: string; save: string; saved: string }
}) {
  const [saved, action] = useActionState(setPortalLanguage, false)
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="page" value={pageLocale} />
      <div className="min-w-48 flex-1 sm:flex-none">
        <Label htmlFor="portal-language">{labels.language}</Label>
        <select
          id="portal-language"
          name="language"
          defaultValue={current}
          className={inputClass(false)}
        >
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </div>
      <Save label={labels.save} />
      {saved ? (
        <p role="status" className="w-full text-caption text-success">
          {labels.saved}
        </p>
      ) : null}
    </form>
  )
}
