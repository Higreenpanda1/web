import { Youtube } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { VideoCarousel } from '@/components/home/VideoCarousel'
import { ButtonLink } from '@/components/ui/Button'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getLatestVideos } from '@/lib/youtube'

import type { Locale } from '@/i18n/routing'

/**
 * "Explore China": the five latest videos from the company YouTube channel,
 * at the very end of the homepage (the owner's placement). Rendered after
 * the CMS blocks rather than as a block of its own, so it is there whether
 * the homepage comes from the CMS or from DefaultHome. If the channel feed
 * cannot be read the section is left out entirely.
 */
export async function ExploreChina({
  locale,
  channelUrl,
}: {
  locale: Locale
  channelUrl?: string | null
}) {
  const videos = await getLatestVideos(5)
  if (videos.length === 0) return null

  const t = await getTranslations({ locale, namespace: 'home' })
  const href = channelUrl || 'https://youtube.com/@Higreenpanda'

  return (
    <Section id="explore-china" labelledBy="home-explore-heading">
      <SectionHeading
        id="home-explore-heading"
        title={t('exploreTitle')}
        lead={t('exploreLead')}
        action={
          <ButtonLink href={href} variant="secondary">
            <Youtube size={18} aria-hidden="true" className="text-[#ff0000]" />
            {t('exploreCta')}
          </ButtonLink>
        }
      />
      <VideoCarousel videos={videos} label={t('exploreTitle')} />
    </Section>
  )
}
