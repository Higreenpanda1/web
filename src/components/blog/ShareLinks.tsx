'use client'

import { Link2, Linkedin, Check } from 'lucide-react'
import { useState } from 'react'

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

/**
 * Sharing, for an audience that lives in WhatsApp groups (brief section 7).
 * Plain links to the share intents — no third-party script, nothing loaded
 * from a social network — plus a copy button, which is what people actually do.
 */
export function ShareLinks({
  url,
  title,
  labels,
}: {
  url: string
  title: string
  labels: {
    share: string
    whatsapp: string
    x: string
    linkedin: string
    copy: string
    copied: string
  }
}) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access refused — the reader still has the address bar.
    }
  }

  const buttonClass =
    'inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-caption font-semibold text-text no-underline transition-colors hover:border-brand-300 hover:bg-surface-tint-soft'

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={labels.share}>
      <span className="me-1 text-caption text-text-muted">{labels.share}</span>
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
      >
        <WhatsAppIcon size={16} />
        {labels.whatsapp}
      </a>
      <a
        href={`https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
      >
        <span aria-hidden="true" className="text-[15px] font-bold leading-none">
          𝕏
        </span>
        {labels.x}
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
      >
        <Linkedin size={16} strokeWidth={1.75} aria-hidden="true" />
        {labels.linkedin}
      </a>
      <button type="button" onClick={copy} className={buttonClass} aria-live="polite">
        {copied ? (
          <Check size={16} strokeWidth={2} aria-hidden="true" className="text-brand-600" />
        ) : (
          <Link2 size={16} strokeWidth={1.75} aria-hidden="true" />
        )}
        {copied ? labels.copied : labels.copy}
      </button>
    </div>
  )
}
