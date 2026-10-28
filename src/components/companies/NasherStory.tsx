import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { NasherStoryMotion } from '@/components/companies/NasherStoryMotion'
import MAP from '@/components/companies/nasher-map.json'
import { ButtonLink } from '@/components/ui/Button'

import type { Locale } from '@/i18n/routing'
import type { ReactNode } from 'react'

import './nasher-story.css'

const IMG = '/brand/nasher-story'

/** A part that flies out of the yacht or the car: its place on wide screens and on phones. */
type Part = {
  key: string
  file: string
  w: number
  h: number
  size: string
  desktop: [number, number]
  phone: [number, number]
}

const SMALL = 'clamp(100px,12vw,200px)'
const LARGE = 'clamp(140px,17vw,270px)'

const SEA_PARTS: Part[] = [
  {
    key: 'engine',
    file: 'part-marine-engine',
    w: 700,
    h: 470,
    size: SMALL,
    desktop: [-0.66, -0.62],
    phone: [-0.5, -0.8],
  },
  {
    key: 'propulsion',
    file: 'part-propulsion',
    w: 700,
    h: 419,
    size: LARGE,
    desktop: [0, -0.7],
    phone: [0.5, -0.8],
  },
  {
    key: 'outboard',
    file: 'part-outboard',
    w: 630,
    h: 700,
    size: SMALL,
    desktop: [0.66, -0.62],
    phone: [-0.5, -0.44],
  },
  {
    key: 'wiring',
    file: 'part-wiring',
    w: 700,
    h: 501,
    size: SMALL,
    desktop: [-0.66, 0.44],
    phone: [0.5, -0.44],
  },
  {
    key: 'helm',
    file: 'part-helm',
    w: 288,
    h: 700,
    size: 'clamp(80px,8vw,130px)',
    desktop: [0, 0.54],
    phone: [-0.5, 0.46],
  },
  {
    key: 'anchor',
    file: 'part-anchor',
    w: 700,
    h: 363,
    size: SMALL,
    desktop: [0.66, 0.44],
    phone: [0.5, 0.46],
  },
]

const LAND_PARTS: Part[] = [
  {
    key: 'chassis',
    file: 'part-chassis',
    w: 700,
    h: 328,
    size: LARGE,
    desktop: [-0.66, -0.64],
    phone: [-0.5, -0.8],
  },
  {
    key: 'transmission',
    file: 'part-transmission',
    w: 700,
    h: 504,
    size: SMALL,
    desktop: [0, -0.7],
    phone: [0.5, -0.8],
  },
  {
    key: 'suspension',
    file: 'part-suspension',
    w: 700,
    h: 527,
    size: 'clamp(90px,10vw,160px)',
    desktop: [0.66, -0.64],
    phone: [-0.5, -0.44],
  },
  {
    key: 'wiring',
    file: 'part-wiring',
    w: 700,
    h: 501,
    size: SMALL,
    desktop: [-0.75, 0.44],
    phone: [0.5, -0.44],
  },
  {
    key: 'tyre',
    file: 'part-tyre',
    w: 467,
    h: 700,
    size: SMALL,
    desktop: [-0.25, 0.56],
    phone: [-0.5, 0.34],
  },
  {
    key: 'rim',
    file: 'part-rim',
    w: 590,
    h: 594,
    size: SMALL,
    desktop: [0.25, 0.56],
    phone: [0.5, 0.34],
  },
  {
    key: 'brakeDisc',
    file: 'part-brake-disc',
    w: 521,
    h: 700,
    size: SMALL,
    desktop: [0.75, 0.44],
    phone: [0, 0.72],
  },
]

const TILT = [-14, 12, -18, 16, -10, 20, -12]

const SERVICES = [
  { n: 1, file: 'svc-factories' },
  { n: 2, file: 'svc-manufacturing' },
  { n: 3, file: 'svc-inspection' },
  { n: 4, file: 'svc-shipping' },
] as const

const STEPS = [1, 2, 3, 4] as const
const BENEFITS = [1, 2, 3, 4, 5] as const

/**
 * Countries where the company holds bank accounts, in the order Shenzhen
 * reaches them on the map: ISO numeric code (the map's id), ISO letters (for
 * the localised name), region, and where the label sits beside the pin.
 */
const COUNTRIES: {
  id: string
  iso: string
  region: Region
  dx: number
  dy: number
  anchor: 'start' | 'middle' | 'end'
}[] = [
  { id: '344', iso: 'HK', region: 'asia', dx: 6, dy: 10, anchor: 'start' },
  { id: '156', iso: 'CN', region: 'asia', dx: 8, dy: -2, anchor: 'start' },
  { id: '704', iso: 'VN', region: 'asia', dx: 8, dy: 6, anchor: 'start' },
  { id: '764', iso: 'TH', region: 'asia', dx: -7, dy: -3, anchor: 'end' },
  { id: '702', iso: 'SG', region: 'asia', dx: -7, dy: 6, anchor: 'end' },
  { id: '360', iso: 'ID', region: 'asia', dx: 6, dy: 13, anchor: 'start' },
  { id: '392', iso: 'JP', region: 'asia', dx: 7, dy: 4, anchor: 'start' },
  { id: '036', iso: 'AU', region: 'oceania', dx: 0, dy: 14, anchor: 'middle' },
  { id: '784', iso: 'AE', region: 'middleEast', dx: -7, dy: 4, anchor: 'end' },
  { id: '404', iso: 'KE', region: 'africa', dx: 8, dy: 4, anchor: 'start' },
  { id: '710', iso: 'ZA', region: 'africa', dx: 0, dy: 14, anchor: 'middle' },
  { id: '566', iso: 'NG', region: 'africa', dx: -7, dy: 4, anchor: 'end' },
  { id: '380', iso: 'IT', region: 'europe', dx: 7, dy: 8, anchor: 'start' },
  { id: '756', iso: 'CH', region: 'europe', dx: 7, dy: -3, anchor: 'start' },
  { id: '826', iso: 'GB', region: 'europe', dx: -6, dy: -4, anchor: 'end' },
  { id: '124', iso: 'CA', region: 'americas', dx: 8, dy: -5, anchor: 'start' },
  { id: '840', iso: 'US', region: 'americas', dx: 8, dy: 8, anchor: 'start' },
  { id: '076', iso: 'BR', region: 'americas', dx: 8, dy: 6, anchor: 'start' },
]

type Region = 'asia' | 'middleEast' | 'africa' | 'europe' | 'americas' | 'oceania'
const REGIONS: Region[] = ['asia', 'middleEast', 'africa', 'europe', 'americas', 'oceania']

const P = MAP.P as unknown as Record<string, [number, number]>
const HL = MAP.hl as Record<string, string>

/**
 * Nasher's scroll story: the yacht, the car and the engine opening into their
 * parts, the services, the four steps and the payments map. The markup is
 * rendered here on the server; NasherStoryMotion only drives it.
 */
export async function NasherStory({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale })
  const s = (key: string) => t(`companies.nasher.story.${key}` as 'companies.nasher.story.hint')
  const rich = (key: string) =>
    t.rich(`companies.nasher.story.${key}` as 'companies.nasher.story.hint', {
      hl: (chunks: ReactNode) => <span className="hl">{chunks}</span>,
    })
  const names = new Intl.DisplayNames([locale], { type: 'region', style: 'short' })
  const country = (iso: string) => names.of(iso) ?? iso
  const [hx, hy] = P.sz!

  const part = (p: Part, i: number) => (
    <div
      key={p.key}
      className="part"
      style={{ '--w': p.size } as React.CSSProperties}
      data-d={`${p.desktop[0]},${p.desktop[1]},${TILT[i]}`}
      data-m={`${p.phone[0]},${p.phone[1]},${TILT[i]}`}
    >
      <Image src={`${IMG}/${p.file}.webp`} width={p.w} height={p.h} alt="" sizes="270px" />
      <span className="lbl">{s(`parts.${p.key}`)}</span>
    </div>
  )

  return (
    <NasherStoryMotion
      order={COUNTRIES.map((c) => [
        c.id,
        country(c.iso),
        t(`companies.nasher.story.regions.${c.region}`),
      ])}
      hubCaption={[s('hub'), s('allConnected')]}
    >
      <svg className="thread" aria-hidden="true">
        <defs>
          <linearGradient id="ns-tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#378d42" />
            <stop offset="1" stopColor="#9fd6a7" />
          </linearGradient>
        </defs>
        <path className="base" />
        <path className="glow" />
        <path className="lit" />
        <g className="nodes" />
        <circle className="tip" r="2.6" />
      </svg>

      {/* The yacht: the sea photo steps back and the yacht opens into its main parts. */}
      <section className="scene" id="sea" data-scene data-stop="" style={{ height: '440vh' }}>
        <div className="stage">
          <div className="photo" style={{ backgroundImage: `url(${IMG}/yacht-sea.webp)` }} />
          <div className="shade" />
          <div className="veil" />
          <div className="copy">
            <div className="wrap">
              <span className="eyebrow">{t('companies.nasher.name')}</span>
              <h1 style={{ marginTop: '.8rem' }}>{t('companies.nasher.pageTitle')}</h1>
              <p className="sub">{rich('heroSub')}</p>
            </div>
          </div>
          <div className="ex" data-ex="sea" role="img" aria-label={s('seaAlt')}>
            <div className="body">
              <Image
                src={`${IMG}/yacht.webp`}
                width={1000}
                height={588}
                alt=""
                sizes="780px"
                priority
              />
            </div>
            {SEA_PARTS.map(part)}
          </div>
          <div className="say">
            <p>{rich('seaSay')}</p>
          </div>
          <div className="hint" data-hint>
            <i />
            {s('hint')}
          </div>
        </div>
      </section>

      {/* The car drives in and opens into its parts; then the engine opens in 3D. */}
      <section className="scene" id="land" data-scene data-stop="" style={{ height: '560vh' }}>
        <div className="stage">
          <div className="floor" />
          <div className="ex" data-ex="land" role="img" aria-label={s('landAlt')}>
            <div className="body">
              <Image src={`${IMG}/car.webp`} width={1000} height={311} alt="" sizes="780px" />
            </div>
            {LAND_PARTS.map(part)}
          </div>
          <canvas id="ns-engine" aria-hidden="true" />
          <div className="copy">
            <div className="wrap">
              <span className="eyebrow">{s('landEyebrow')}</span>
              <h2 style={{ marginTop: '.8rem' }}>{rich('landTitle')}</h2>
            </div>
          </div>
          <div className="say low" data-engine-say>
            <p>{rich('landSay')}</p>
          </div>
        </div>
      </section>

      <section className="block" id="svc" data-stop="" aria-labelledby="ns-svc">
        <div className="wrap">
          <div className="head fx">
            <span className="eyebrow">{t('companies.nasher.name')}</span>
            <h2 id="ns-svc">{t('companies.nasher.servicesEyebrow')}</h2>
          </div>
          <ul className="alt-list svc">
            {SERVICES.map(({ n, file }) => (
              <li key={n} className="fx">
                <div className="card">
                  <Image
                    src={`${IMG}/${file}.webp`}
                    width={1200}
                    height={800}
                    alt=""
                    sizes="(max-width: 600px) 100vw, 560px"
                  />
                  <span className="bar" />
                  <div className="t">
                    <span className="n">{`0${n}`}</span>
                    <h3>{t(`companies.nasher.services.${n}`)}</h3>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="block alt" id="how" data-stop="" aria-labelledby="ns-how">
        <div className="wrap">
          <div className="head fx">
            <span className="eyebrow">{t('companies.nasher.processEyebrow')}</span>
            <h2 id="ns-how">{s('stepsTitle')}</h2>
          </div>
          <ol className="alt-list steps">
            {STEPS.map((n) => (
              <li key={n} className="fx">
                <div className="card">
                  <span className="bar" />
                  <span className="n">{`0${n}`}</span>
                  <h3>{t(`companies.nasher.process.${n}.title`)}</h3>
                  <p>{t(`companies.nasher.process.${n}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="block" id="pay" data-stop="" aria-labelledby="ns-pay">
        <div className="wrap pay">
          <div className="head fx" style={{ marginBottom: 0 }}>
            <span className="eyebrow">{s('payEyebrow')}</span>
            <h2 id="ns-pay">{rich('payTitle')}</h2>
            <p>{s('payLead')}</p>
          </div>
          <div className="mapbox fx" data-map>
            <svg viewBox={`0 0 ${MAP.W} ${MAP.H - 36}`} role="img" aria-label={s('mapAlt')}>
              <path className="m-grat" d={MAP.grat} />
              <path className="m-land" d={MAP.land} />
              {Object.entries(HL).map(([id, d]) => (
                <path key={id} className="m-c" data-c={id} d={d} />
              ))}
              <path className="m-bord" d={MAP.borders} />
              <g data-arcs />
              {COUNTRIES.map((c) => {
                const [x, y] = P[c.id]!
                return (
                  <g key={c.id}>
                    <g className="m-pin" data-pin={c.id} data-x={x} data-y={y}>
                      <circle className="ring" cx={x} cy={y} r="2" />
                      <circle className="dot" cx={x} cy={y} r="2.4" />
                    </g>
                    <text
                      className="m-lbl"
                      data-lbl={c.id}
                      x={x + c.dx}
                      y={y + c.dy}
                      textAnchor={c.anchor}
                    >
                      {country(c.iso)}
                    </text>
                  </g>
                )
              })}
              <g className="m-pin hub" data-hub data-x={hx} data-y={hy}>
                <circle className="ring" cx={hx} cy={hy} r="2" />
                <circle className="dot" cx={hx} cy={hy} r="3.6" />
              </g>
              <text className="m-lbl hub" x={hx - 6} y={hy - 7} textAnchor="end">
                {s('hub')}
              </text>
            </svg>
            <div className="mapcap" aria-live="polite">
              <strong data-cap />
              <span data-capr />
            </div>
          </div>
          <ul className="benefits" data-benefits>
            {BENEFITS.map((n) => (
              <li key={n}>
                <h3>{s(`benefits.${n}.title`)}</h3>
                <p>{s(`benefits.${n}.body`)}</p>
              </li>
            ))}
          </ul>
          <dl className="regions fx">
            {REGIONS.map((r) => (
              <div key={r}>
                <dt>{t(`companies.nasher.story.regions.${r}`)}</dt>
                <dd>
                  {COUNTRIES.filter((c) => c.region === r)
                    .map((c) => country(c.iso))
                    .join(locale === 'zh' ? '、' : locale === 'ar' ? '، ' : ', ')}
                </dd>
              </div>
            ))}
          </dl>
          <div className="ns-cta">
            <ButtonLink href="/contact" size="lg">
              {t('cta.contactUs')}
            </ButtonLink>
            <ButtonLink href="/licences#nasher" size="lg" variant="secondary">
              {t('companies.nasher.viewLicence')}
            </ButtonLink>
          </div>
        </div>
      </section>
    </NasherStoryMotion>
  )
}
