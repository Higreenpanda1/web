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
    <Container className="py-24 text-center">
      <h1 className="text-h1">{t('genericTitle')}</h1>
      <p className="mx-auto mt-4 max-w-[var(--measure)] text-body-lg text-[var(--text-muted)]">
        {t('genericBody')}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button type="button" size="lg" onClick={reset}>
          {t('retry')}
        </Button>
        <ButtonLink href="/" size="lg" variant="secondary">
          {t('backHome')}
        </ButtonLink>
      </div>
      {error.digest ? (
        <p className="ltr-nums mt-6 text-caption text-[var(--text-muted)]">{error.digest}</p>
      ) : null}
    </Container>
  )
}
