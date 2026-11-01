'use client'

import { useEffect, useRef } from 'react'

/** Bring the replacement success message into view after a long form disappears. */
export function useSuccessNotice(success: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!success) return
    const frame = requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true })
      ref.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [success])
  return ref
}
