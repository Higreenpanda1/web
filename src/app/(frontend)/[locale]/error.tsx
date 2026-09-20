'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { Button, ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('error')

  useEffect(() => {
    // The digest is the only safe identifier to show: the message itself can
    // carry internals, and this page is public.
    console.error('[page error]', error.digest ?? error.message)
  }, [error])

  return (
    <section className="relative isolate overflow-hidden bg-surface bg-gradient-hero">
      <div className="absolute inset-0 -z-10 bg-dots opacity-70" aria-hidden="true" />
      <Container className="py-24 text-center md:py-32">
        <h1 className="text-display">{t('genericTitle')}</h1>
        <p className="mx-auto mt-5 max-w-[var(--measure)] text-body-lg text-text-muted">
          {t('genericBody')}
        </p>
        <div className="mt-9 flex justify-center gap-3">
          <Button type="button" size="lg" onClick={reset}>
            {t('retry')}
          </Button>
          <ButtonLink href="/" size="lg" variant="secondary">
            {t('backHome')}
          </ButtonLink>
        </div>
        {error.digest ? (
          <p className="ltr-nums mt-8 text-caption text-text-muted">{error.digest}</p>
        ) : null}
      </Container>
    </section>
  )
}
