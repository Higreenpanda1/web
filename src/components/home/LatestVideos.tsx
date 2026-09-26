import { Play, Youtube } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { ButtonLink } from '@/components/ui/Button'
import { Section, SectionHeading } from '@/components/ui/Section'
import { formatDate, isoDate } from '@/i18n/format'
import { getLatestVideos } from '@/lib/youtube'

import type { Locale } from '@/i18n/routing'

/**
 * The homepage band with the three newest YouTube videos. Thumbnails link out
 * to YouTube rather than embedding a player, so the page loads no third-party
 * script. Renders nothing when the feed cannot be reached.
 */
export async function LatestVideos({
  locale,
  channelUrl,
}: {
  locale: Locale
  channelUrl: string | null | undefined
}) {
  const [t, videos] = await Promise.all([
    getTranslations({ locale }),
    getLatestVideos(channelUrl, 3),
  ])
  if (videos.length === 0 || !channelUrl) return null

  return (
    <Section tone="inverse" labelledBy="home-videos-heading">
      <SectionHeading
        id="home-videos-heading"
        eyebrow={t('home.videosEyebrow')}
        title={t('home.videosTitle')}
        lead={t('home.videosLead')}
        inverse
        action={
          <ButtonLink href={channelUrl} variant="inverse">
            <Youtube size={18} strokeWidth={2} aria-hidden="true" />
            {t('home.videosCta')}
          </ButtonLink>
        }
      />
      <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <li key={video.id}>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10 transition hover:ring-brand-300"
            >
              <div className="relative aspect-video overflow-hidden bg-black">
                {/* External thumbnail: next/image would need i.ytimg.com in
                    remotePatterns, which is kept empty on purpose. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.thumbnail}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center bg-black/15"
                >
                  <span className="inline-flex size-14 items-center justify-center rounded-full bg-white/90 text-brand-900 shadow-lg">
                    <Play size={26} strokeWidth={2} className="ms-1" fill="currentColor" />
                  </span>
                </span>
              </div>
              <div className="p-5">
                <h3 className="line-clamp-2 text-white">{video.title}</h3>
                {video.published ? (
                  <p className="mt-2 text-caption text-brand-100">
                    <bdi>
                      <time dateTime={isoDate(video.published)}>
                        {formatDate(video.published, locale)}
                      </time>
                    </bdi>
                  </p>
                ) : null}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}
