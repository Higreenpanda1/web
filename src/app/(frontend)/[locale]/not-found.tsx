import { getTranslations } from 'next-intl/server'

import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

export default async function NotFound() {
  // A not-found render has no route params, so the locale cannot be read from
  // the URL here. The message catalogue defaults to Arabic, which is the right
  // guess for this audience.
  const t = await getTranslations()

  return (
    <Container className="py-24 text-center">
      <p className="ltr-nums text-h1 font-bold text-[var(--brand-400)]">404</p>
      <h1 className="mt-3 text-h1">{t('error.notFoundTitle')}</h1>
      <p className="mx-auto mt-4 max-w-[var(--measure)] text-body-lg text-[var(--text-muted)]">
        {t('error.notFoundBody')}
      </p>
      <ButtonLink href="/" size="lg" className="mt-8">
        {t('error.backHome')}
      </ButtonLink>
    </Container>
  )
}
