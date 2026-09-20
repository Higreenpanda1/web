import { getTranslations } from 'next-intl/server'

import { PlayMark } from '@/components/layout/Logo'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

export default async function NotFound() {
  // A not-found render has no route params, so the locale cannot be read from
  // the URL here. The message catalogue defaults to Arabic, which is the right
  // guess for this audience.
  const t = await getTranslations()

  return (
    <section className="relative isolate overflow-hidden bg-surface bg-gradient-hero">
      <div className="absolute inset-0 -z-10 bg-dots opacity-70" aria-hidden="true" />
      <Container className="py-24 text-center md:py-32">
        <PlayMark size={72} className="mx-auto" />
        <p className="ltr-nums mt-8 text-eyebrow font-bold tracking-[0.2em] text-text-brand">404</p>
        <h1 className="mt-3 text-display">{t('error.notFoundTitle')}</h1>
        <p className="mx-auto mt-5 max-w-[var(--measure)] text-body-lg text-text-muted">
          {t('error.notFoundBody')}
        </p>
        <ButtonLink href="/" size="lg" className="mt-9">
          {t('error.backHome')}
        </ButtonLink>
      </Container>
    </section>
  )
}
