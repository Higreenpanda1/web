'use client'

import { useTranslations } from 'next-intl'

/** Contact details at the end of the application and on the confirmation screen. */
export function ApplicationSupport() {
  const t = useTranslations('apply')
  return (
    <aside className="mt-5 rounded-xl border border-[var(--border-soft)] p-4 text-body-sm">
      <p className="mb-3 font-medium">{t('supportPrompt')}</p>
      <ul className="m-0 list-none space-y-2 p-0">
        <li>
          {t('supportWhatsApp')}:{' '}
          <a
            className="underline underline-offset-4"
            href="https://wa.me/8613023440305"
            target="_blank"
            rel="noopener noreferrer"
          >
            <bdi dir="ltr">+86 130 2344 0305</bdi>
          </a>
        </li>
        <li>
          {t('supportWeChat')}:{' '}
          <bdi dir="ltr" className="select-all">
            13023440305
          </bdi>
        </li>
        <li>
          {t('supportEmail')}:{' '}
          <a className="underline underline-offset-4" href="mailto:contact@higreenpanda.com">
            <bdi dir="ltr">contact@higreenpanda.com</bdi>
          </a>
        </li>
      </ul>
    </aside>
  )
}
