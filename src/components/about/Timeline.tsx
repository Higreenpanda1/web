import { Award, BookOpen, Briefcase, GraduationCap } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { cn } from '@/lib/cn'

import type { Locale } from '@/i18n/routing'
import type { TeamMember } from '@/payload-types'

type Milestone = NonNullable<TeamMember['timeline']>[number]

const ICONS = {
  work: Briefcase,
  education: GraduationCap,
  award: Award,
  course: BookOpen,
} as const

/**
 * The founder's career and education as a vertical timeline: a period in the
 * margin, a marker on the spine, and the title, organisation and a line or
 * two on what was done. It reads the `timeline` array on the team record, so
 * a new job or award is a CMS edit. Renders nothing when the array is empty.
 *
 * Periods are set `ltr-nums` so "2020 – 2022" keeps its order inside an
 * Arabic paragraph.
 */
export async function Timeline({
  items,
  locale,
  className,
}: {
  items: Milestone[] | null | undefined
  locale: Locale
  className?: string
}) {
  if (!items || items.length === 0) return null
  const t = await getTranslations({ locale })

  return (
    <ol className={cn('relative m-0 list-none p-0', className)}>
      <span
        aria-hidden="true"
        className="absolute inset-y-2 start-[1.1875rem] w-px bg-border-soft md:start-[9.5rem]"
      />
      {items.map((item, index) => {
        const Icon = ICONS[item.kind ?? 'work']
        return (
          <li
            key={item.id ?? index}
            className="relative grid gap-3 py-5 ps-14 md:grid-cols-[8rem_1fr] md:gap-10 md:ps-0"
            data-reveal
          >
            <span
              aria-hidden="true"
              className="absolute start-0 top-5 inline-flex size-10 items-center justify-center rounded-full border border-border-soft bg-surface text-text-brand shadow-card md:start-[8.25rem]"
            >
              <Icon size={18} strokeWidth={1.75} />
            </span>
            <div className="md:pt-2.5 md:text-end">
              <span className="ltr-nums block font-semibold text-heading">{item.period}</span>
              <span className="block text-caption text-text-muted">
                {t(`about.journeyKinds.${item.kind ?? 'work'}`)}
              </span>
            </div>
            <div className="md:ps-10">
              <h3 className="text-h3">{item.title}</h3>
              {item.organisation ? (
                <p className="mt-1 font-medium text-text-brand">{item.organisation}</p>
              ) : null}
              {item.note ? (
                <p className="mt-2 max-w-[var(--measure)] text-text-muted">{item.note}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
