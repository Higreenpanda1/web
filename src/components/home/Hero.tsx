import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Globe2,
  MapPin,
  MessageSquareText,
  Search,
  Ship,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { PlayMark } from '@/components/layout/Logo'
import { ButtonLink } from '@/components/ui/Button'
import { CountUp } from '@/components/ui/CountUp'
import { Container } from '@/components/ui/Container'
import { cn } from '@/lib/cn'
import { whatsappLink } from '@/lib/url'

import type { Locale } from '@/i18n/routing'
import type { SiteSetting } from '@/payload-types'

const STEP_ICONS = [MessageSquareText, Search, ClipboardCheck, Ship] as const
type StepState = 'done' | 'now' | 'next'
// The inspection step is the one that sells: "we inspect before you pay" is
// the promise a nervous first-time importer most wants to see in progress.
const STEP_STATE: StepState[] = ['done', 'done', 'now', 'next']

/**
 * The homepage hero. Light, not a dark box: the brand wash and dot grid carry
 * the colour, the wordmark in the header carries the identity, and the
 * "journey card" on the trailing side shows the four-step process as a live
 * thing rather than a paragraph. There is no photography yet (brief section
 * 15 asks for real photos of the founder on the ground); the card is built to
 * hold its own until they arrive.
 */
export async function Hero({ locale, settings }: { locale: Locale; settings: SiteSetting }) {
  const t = await getTranslations({ locale })
  const whatsapp = whatsappLink(settings.whatsappNumber, settings.whatsappPrefill ?? undefined)
  const steps = [1, 2, 3, 4] as const

  return (
    <section className="relative isolate overflow-hidden bg-surface bg-gradient-hero">
      <div className="absolute inset-0 -z-10 bg-dots opacity-30" aria-hidden="true" />
      {/* Two soft orbs drifting behind the card — depth without colour blocks. */}
      <div
        aria-hidden="true"
        className="orb -top-24 end-[8%] -z-10 size-[28rem] bg-brand-200/60 dark:bg-brand-700/25"
      />
      <div
        aria-hidden="true"
        className="orb bottom-0 start-[30%] -z-10 size-[22rem] bg-[#e9e6dc]/70 dark:bg-white/5"
        style={{ animationDelay: '-9s', animationDuration: '24s' }}
      />

      <Container className="grid items-center gap-14 py-14 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-28">
        <div className="max-w-[40rem]">
          <p className="reveal inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3.5 py-1.5 text-caption font-semibold text-heading shadow-sm">
            <MapPin size={16} strokeWidth={2} aria-hidden="true" className="text-brand-600" />
            {t('home.heroEyebrow')}
          </p>

          <h1 className="word-reveal mt-6 text-display">
            {t('home.heroTitle')
              .split(' ')
              .map((word, index) => (
                <span key={index} className="word" style={{ '--i': index } as React.CSSProperties}>
                  {word}
                  {'\u00a0'}
                </span>
              ))}
            {/* The green disc as punctuation: the brand's one device, used the
                way a full stop is used. */}
            <PlayMark size={24} className="ms-3 inline-block size-[0.42em] align-baseline" />
          </h1>

          <p className="reveal reveal-2 mt-6 text-body-lg text-text-muted">{t('home.heroLead')}</p>

          <p className="reveal reveal-2 mt-5 flex items-start gap-2.5 font-semibold text-text-brand">
            <CheckCircle2
              size={22}
              strokeWidth={2}
              aria-hidden="true"
              className="mt-1 shrink-0 text-brand-600"
            />
            <span>{t('home.heroPromise')}</span>
          </p>

          <div className="reveal reveal-3 mt-9 flex flex-wrap gap-3">
            <ButtonLink href="#journey" size="lg">
              {t('cta.exploreJourney')}
            </ButtonLink>
            <ButtonLink href="/apply/consultation" size="lg" variant="secondary">
              {t('cta.bookConsultation')}
            </ButtonLink>
            <ButtonLink
              href={whatsapp}
              size="lg"
              variant="ghost"
              aria-label={t('cta.whatsapp')}
              title={t('cta.whatsapp')}
            >
              <WhatsAppIcon size={20} className="text-text-brand" />
              <span className="sm:hidden">{t('cta.whatsapp')}</span>
            </ButtonLink>
          </div>

          <dl className="reveal reveal-4 mt-12 grid grid-cols-3 gap-4 border-t border-border-soft pt-8 sm:gap-8">
            {(
              [
                ['235+', t('home.stats.cities')],
                ['100+', t('home.stats.fairs')],
                ['75K+', t('home.stats.followers')],
              ] as const
            ).map(([value, label]) => (
              <div key={label}>
                <dt className="ltr-nums text-h2 font-bold text-heading">
                  <CountUp value={value} />
                </dt>
                <dd className="mt-0.5 text-caption text-text-muted">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The journey card. */}
        <div className="reveal reveal-2 relative mx-auto w-full max-w-[26rem] lg:mx-0 lg:justify-self-end">
          <div
            aria-hidden="true"
            className="absolute -inset-6 -z-10 rounded-[3rem] bg-brand-300 opacity-[0.12] blur-2xl"
          />

          <div className="rounded-xl border border-border-soft bg-surface p-6 shadow-float">
            <div className="flex items-center gap-3">
              <PlayMark size={42} />
              <div className="min-w-0">
                <p className="font-bold text-heading">{t('home.heroCardTitle')}</p>
                <p className="truncate text-caption text-text-muted">{t('home.journeyStatus')}</p>
              </div>
            </div>

            <ol className="mt-6 list-none space-y-1 p-0">
              {steps.map((step, index) => {
                const Icon = STEP_ICONS[index] ?? STEP_ICONS[0]
                const state = STEP_STATE[index]
                const last = index === steps.length - 1
                return (
                  <li key={step} className="relative flex gap-4 py-2">
                    {!last ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute start-5 top-[3.1rem] bottom-[-0.35rem] w-px',
                          state === 'done' ? 'bg-brand-400' : 'bg-border',
                        )}
                      />
                    ) : null}
                    <span
                      className={cn(
                        'relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full',
                        state === 'done' && 'bg-brand-700 text-white',
                        state === 'now' && 'bg-surface-tint text-text-brand ring-2 ring-brand-500',
                        state === 'next' &&
                          'border border-border bg-surface-sunken text-text-muted',
                      )}
                    >
                      {state === 'done' ? (
                        <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                      ) : (
                        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 pt-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className={cn(
                            'font-semibold',
                            state === 'next' ? 'text-text-muted' : 'text-heading',
                          )}
                        >
                          {t(`home.process.step${step}Title` as 'home.process.step1Title')}
                        </p>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-eyebrow font-bold',
                            state === 'done' && 'bg-surface-tint text-text-brand',
                            state === 'now' && 'bg-brand-700 text-white',
                            state === 'next' && 'bg-surface-sunken text-text-muted',
                          )}
                        >
                          {state === 'done'
                            ? t('home.journeyDone')
                            : state === 'now'
                              ? t('home.journeyNow')
                              : t('home.journeyNext')}
                        </span>
                      </div>
                      {state === 'now' ? (
                        <p className="mt-1.5 line-clamp-2 text-caption text-text-muted">
                          {t(`home.process.step${step}Body` as 'home.process.step1Body')}
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>

          <p className="absolute -top-4 -end-3 hidden items-center gap-2 rounded-full border border-border-soft bg-surface px-4 py-2 text-caption font-semibold text-heading shadow-card sm:inline-flex">
            <Globe2 size={17} strokeWidth={1.75} aria-hidden="true" className="text-brand-600" />
            <span className="ltr-nums">{t('home.heroChipCities')}</span>
          </p>
          <p className="absolute -bottom-5 -start-3 hidden items-center gap-2 rounded-full border border-border-soft bg-surface px-4 py-2 text-caption font-semibold text-heading shadow-card motion-safe:animate-float sm:inline-flex">
            <WhatsAppIcon size={17} className="text-text-brand" />
            {t('home.heroChipReply')}
          </p>
        </div>
      </Container>
    </section>
  )
}
