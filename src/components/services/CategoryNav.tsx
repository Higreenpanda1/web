import { getTranslations } from 'next-intl/server'

import { CATEGORY_ICON, ServiceIcon } from '@/components/ServiceIcon'
import { Container } from '@/components/ui/Container'

import type { Locale } from '@/i18n/routing'
import type { ServiceGroup } from '@/lib/services'

/**
 * A sticky row of anchor chips under the header on the services index. Plain
 * anchors with `scroll-mt` on the targets: no JavaScript, works with the
 * keyboard, and the browser's own smooth scrolling (globals.css) does the
 * motion. On a phone the row scrolls sideways rather than wrapping into a
 * second header.
 */
export async function CategoryNav({ groups, locale }: { groups: ServiceGroup[]; locale: Locale }) {
  const t = await getTranslations({ locale })

  return (
    <nav
      aria-label={t('services.categoriesTitle')}
      className="sticky top-[var(--header-height)] z-30 border-b border-border-soft bg-surface/90 backdrop-blur-md"
    >
      <Container>
        <ul className="-mx-4 flex list-none gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {groups.map(({ category, services }) => (
            <li key={category} className="shrink-0">
              <a
                href={`#${category}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-soft bg-surface px-4 text-caption font-semibold text-heading no-underline transition-colors hover:border-brand-400 hover:bg-surface-tint-soft"
              >
                <ServiceIcon name={CATEGORY_ICON[category]} size={16} className="text-text-brand" />
                {t(`services.categories.${category}.short`)}
                <span className="ltr-nums rounded-full bg-surface-tint px-1.5 text-eyebrow text-text-brand">
                  {services.length}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  )
}
