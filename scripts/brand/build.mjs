// Builds every HiGreenPanda brand asset from the vector wordmark + play icon.
// Run from the repo root:  node scripts/brand/build.mjs
// Inputs: wordmark.json (traced letterforms + disc geometry) and taglines.json
// (Arabic/English taglines shaped into outlines with the site's own Plex fonts).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = process.cwd()
const trace = JSON.parse(fs.readFileSync(`${HERE}/wordmark.json`, 'utf8'))
const text = JSON.parse(fs.readFileSync(`${HERE}/taglines.json`, 'utf8'))

const GREEN = '#378D42',
  INK = '#111111',
  DEEP = '#12341B',
  DEEP2 = '#1B4F27'
const [W, H] = trace.vb
const { cx, cy, r } = trace.disc
const k = (2 * r) / 512
const tri = [
  [178, 144],
  [381, 256],
  [178, 368],
]
  .map(([x, y]) => `${(cx - r + x * k).toFixed(1)},${(cy - r + y * k).toFixed(1)}`)
  .join(' ')
const sw = (30.4 * k).toFixed(2)
const d = trace.d

// ---------- SVG wordmark variants ----------
const head = (vb, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="HiGreenPanda"${extra}>\n  <title>HiGreenPanda</title>\n`
const knockoutMask = (id) =>
  `  <defs>\n    <mask id="${id}"><rect width="${W}" height="${H}" fill="#fff"/><polygon points="${tri}" fill="none" stroke="#000" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/></mask>\n  </defs>\n`
const wordmark = {
  colour:
    head(`0 0 ${W} ${H}`) +
    knockoutMask('hgp-k') +
    `  <path d="${d}" fill="${INK}"/>\n  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${GREEN}" mask="url(#hgp-k)"/>\n</svg>\n`,
  white:
    head(`0 0 ${W} ${H}`) +
    `  <path d="${d}" fill="#FFFFFF"/>\n  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${GREEN}"/>\n  <polygon points="${tri}" fill="none" stroke="#FFFFFF" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>\n</svg>\n`,
  monoBlack:
    head(`0 0 ${W} ${H}`) +
    knockoutMask('hgp-k') +
    `  <path d="${d}" fill="#000000"/>\n  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#000000" mask="url(#hgp-k)"/>\n</svg>\n`,
  monoWhite:
    head(`0 0 ${W} ${H}`) +
    knockoutMask('hgp-k') +
    `  <path d="${d}" fill="#FFFFFF"/>\n  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" mask="url(#hgp-k)"/>\n</svg>\n`,
}
const iconKnockout = fs.readFileSync('public/brand/vector/icon-play.svg', 'utf8')
const iconSolid = fs.readFileSync('public/brand/vector/icon-play-white.svg', 'utf8')

const out = (rel) => {
  const p = path.join(ROOT, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  return p
}
const both = (rel, content) => {
  for (const base of ['brand-assets', 'public/brand'])
    fs.writeFileSync(out(`${base}/${rel}`), content)
}
both('vector/logo-wordmark.svg', wordmark.colour)
both('vector/logo-wordmark-white.svg', wordmark.white)
both('vector/logo-wordmark-mono-black.svg', wordmark.monoBlack)
both('vector/logo-wordmark-mono-white.svg', wordmark.monoWhite)

// The inline React component reads the same geometry, so the header logo is the file, not a copy of it.
fs.writeFileSync(
  out('src/components/layout/wordmark-geometry.ts'),
  `/**
 * The HiGP wordmark as vector geometry, traced from the master artwork
 * (brand-assets/vector/logo-wordmark.svg is built from the same data).
 * Generated — do not edit by hand. Regenerate with the brand build script.
 */
export const WORDMARK_VIEWBOX = { width: ${W}, height: ${H} } as const
export const WORDMARK_DISC = { cx: ${cx}, cy: ${cy}, r: ${r} } as const
export const WORDMARK_TRIANGLE = { points: '${tri}', strokeWidth: ${sw} } as const
export const WORDMARK_PATH =
  '${d}'
`,
)

// ---------- helpers ----------
const render = (svg, width, opts = {}) =>
  sharp(Buffer.from(svg), { density: 400 }).resize({ width, ...opts })
const png = async (svg, width, rel, extra = (s) => s) => {
  await extra(render(svg, width)).png({ compressionLevel: 9 }).toFile(out(rel))
}
const square = async (
  iconSvg,
  size,
  rel,
  { pad = 0, bg = { r: 0, g: 0, b: 0, alpha: 0 } } = {},
) => {
  const inner = Math.round(size * (1 - pad))
  const icon = await sharp(Buffer.from(iconSvg), { density: 400 })
    .resize(inner, inner)
    .png()
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: icon, gravity: 'centre' }])
    .png()
    .toFile(out(rel))
}
// A line is either one shaped run, or `segments` (shaped words) joined by a drawn
// dot — the Arabic subset has no "·" glyph, so the separator is geometry.
const lineWidth = (l) =>
  l.segments
    ? l.segments.reduce((w, s) => w + s.width, 0) + (l.segments.length - 1) * l.size * 1.1
    : l.width
const textPath = (lines, { x, y, size, fill, anchor = 'start', lineHeight = 1.35 }) =>
  lines
    .map((l, i) => {
      const w = lineWidth(l),
        ly = y + i * size * lineHeight
      const tx = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x
      if (!l.segments)
        return `<path transform="translate(${tx.toFixed(1)} ${ly.toFixed(1)})" d="${l.d}" fill="${fill}"/>`
      // RTL: the first segment sits at the right-hand end of the line.
      let cursor = tx + w,
        parts = []
      l.segments.forEach((s, j) => {
        cursor -= s.width
        parts.push(
          `<path transform="translate(${cursor.toFixed(1)} ${ly.toFixed(1)})" d="${s.d}" fill="${fill}"/>`,
        )
        if (j < l.segments.length - 1) {
          const gap = l.size * 1.1
          parts.push(
            `<circle cx="${(cursor - gap / 2).toFixed(1)}" cy="${(ly - l.size * 0.28).toFixed(1)}" r="${(l.size * 0.09).toFixed(1)}" fill="${fill}"/>`,
          )
          cursor -= gap
        }
      })
      return parts.join('\n')
    })
    .join('\n')
const wordmarkAt = (x, y, height, variant = 'colour') => {
  const s = height / H
  const body =
    variant === 'white'
      ? `<path d="${d}" fill="#FFFFFF"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${GREEN}"/><polygon points="${tri}" fill="none" stroke="#FFFFFF" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`
      : `<path d="${d}" fill="${INK}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${GREEN}"/><polygon points="${tri}" fill="none" stroke="#FFFFFF" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`
  return `<g transform="translate(${x} ${y}) scale(${s})">${body}</g>`
}
const playAt = (x, y, size, colour = GREEN, tricolour = '#FFFFFF', opacity = 1) => {
  const s = size / 512
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${opacity}"><circle cx="256" cy="256" r="256" fill="${colour}"/><polygon points="178,144 381,256 178,368" fill="none" stroke="${tricolour}" stroke-width="30.4" stroke-linejoin="round" stroke-linecap="round"/></g>`
}

// ---------- web PNGs ----------
for (const [w, name] of [
  [400, 'logo-wordmark@1x.png'],
  [800, 'logo-wordmark@2x.png'],
  [1200, 'logo-wordmark@3x.png'],
  [2400, 'logo-wordmark-large.png'],
]) {
  await png(wordmark.colour, w, `brand-assets/web/${name}`)
}
await png(wordmark.white, 800, 'brand-assets/web/logo-wordmark-white@2x.png')
await png(wordmark.monoBlack, 800, 'brand-assets/web/logo-wordmark-mono-black@2x.png')
await png(wordmark.monoWhite, 800, 'brand-assets/web/logo-wordmark-mono-white@2x.png')
for (const f of [
  'logo-wordmark@1x.png',
  'logo-wordmark@2x.png',
  'logo-wordmark-white@2x.png',
  'logo-wordmark-mono-black@2x.png',
  'logo-wordmark-mono-white@2x.png',
])
  fs.copyFileSync(out(`brand-assets/web/${f}`), out(`public/brand/web/${f}`))
for (const s of [256, 512, 1024]) {
  await square(iconKnockout, s, `brand-assets/web/icon-knockout-${s}.png`)
  await square(iconSolid, s, `brand-assets/web/icon-solid-${s}.png`)
}
fs.copyFileSync(
  out('brand-assets/web/icon-solid-512.png'),
  out('public/brand/web/icon-solid-512.png'),
)

// ---------- favicons + app icons ----------
await square(iconSolid, 180, 'brand-assets/favicon/apple-touch-icon.png', {
  pad: 0.12,
  bg: '#FFFFFF',
})
await square(iconKnockout, 192, 'brand-assets/favicon/icon-192.png')
await square(iconKnockout, 512, 'brand-assets/favicon/icon-512.png')
await square(iconSolid, 512, 'brand-assets/favicon/icon-maskable-512.png', {
  pad: 0.34,
  bg: '#FFFFFF',
})
fs.writeFileSync(out('brand-assets/favicon/favicon.svg'), iconKnockout)
// favicon.ico: PNG-compressed entries in an ICO container
const icoSizes = [16, 32, 48]
const entries = []
for (const s of icoSizes)
  entries.push(
    await sharp(Buffer.from(iconKnockout), { density: 400 }).resize(s, s).png().toBuffer(),
  )
const dir = Buffer.alloc(6 + 16 * entries.length)
dir.writeUInt16LE(0, 0)
dir.writeUInt16LE(1, 2)
dir.writeUInt16LE(entries.length, 4)
let offset = dir.length
entries.forEach((buf, i) => {
  const s = icoSizes[i]
  const o = 6 + 16 * i
  dir.writeUInt8(s, o)
  dir.writeUInt8(s, o + 1)
  dir.writeUInt8(0, o + 2)
  dir.writeUInt8(0, o + 3)
  dir.writeUInt16LE(1, o + 4)
  dir.writeUInt16LE(32, o + 6)
  dir.writeUInt32LE(buf.length, o + 8)
  dir.writeUInt32LE(offset, o + 12)
  offset += buf.length
})
fs.writeFileSync(out('brand-assets/favicon/favicon.ico'), Buffer.concat([dir, ...entries]))
for (const f of [
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'favicon.svg',
  'favicon.ico',
])
  fs.copyFileSync(out(`brand-assets/favicon/${f}`), out(`public/${f}`))

// ---------- social ----------
const ogCard = (lang) => {
  const rtl = lang === 'ar'
  const tag = text[`${lang}_tagline`],
    sub = text[`${lang}_sub`],
    dom = text.domain
  const margin = 84,
    x = rtl ? 1200 - margin : margin,
    anchor = rtl ? 'end' : 'start'
  const motifX = rtl ? -260 : 1200 - 480
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEF7F0"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${playAt(motifX, 150, 740, '#E2F3E5', '#FFFFFF', 0.9)}
  ${wordmarkAt(rtl ? 1200 - margin - 300 : margin, 74, 140)}
  ${textPath(tag, { x, y: 318, size: tag[0].size, fill: DEEP, anchor })}
  ${textPath(sub, { x, y: 460, size: sub[0].size, fill: '#4C574F', anchor })}
  <rect x="0" y="606" width="1200" height="24" fill="${GREEN}"/>
  ${playAt(rtl ? 1200 - margin - 30 : margin, 536, 30)}
  ${textPath(dom, { x: rtl ? 1200 - margin - 42 : margin + 42, y: 560, size: dom[0].size, fill: DEEP2, anchor })}
</svg>`
}
await sharp(Buffer.from(ogCard('en')))
  .png()
  .toFile(out('brand-assets/social/og-image-en.png'))
await sharp(Buffer.from(ogCard('ar')))
  .png()
  .toFile(out('brand-assets/social/og-image-ar.png'))
fs.copyFileSync(out('brand-assets/social/og-image-ar.png'), out('brand-assets/social/og-image.png'))
for (const f of ['og-image-en.png', 'og-image-ar.png', 'og-image.png'])
  fs.copyFileSync(out(`brand-assets/social/${f}`), out(`public/brand/social/${f}`))
await square(iconSolid, 400, 'brand-assets/social/avatar.png')
await square(iconSolid, 800, 'brand-assets/social/avatar-800.png')
await square(iconSolid, 640, 'brand-assets/social/whatsapp-profile.png')
const yt = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${DEEP2}"/><stop offset="1" stop-color="${DEEP}"/></linearGradient></defs>
  <rect width="2560" height="1440" fill="url(#g)"/>
  ${playAt(1900, -200, 1100, '#1F5A2C', '#2A6B39', 1)}
  ${wordmarkAt(1280 - 290, 540, 270, 'white')}
  ${textPath(text.yt_ar, { x: 1280, y: 890, size: 40, fill: '#E2F3E5', anchor: 'middle' })}
  ${textPath(text.yt_en, { x: 1280, y: 950, size: 24, fill: '#9FD6A7', anchor: 'middle' })}
</svg>`
await sharp(Buffer.from(yt)).png().toFile(out('brand-assets/social/youtube-banner.png'))
const ig = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="#FFFFFF"/>
  <rect x="0" y="0" width="1080" height="18" fill="${GREEN}"/>
  ${playAt(700, 700, 620, '#E2F3E5', '#FFFFFF', 1)}
  ${wordmarkAt(96, 96, 130)}
  ${textPath(text.domain_lg, { x: 96, y: 990, size: 34, fill: DEEP2 })}
</svg>`
await sharp(Buffer.from(ig)).png().toFile(out('brand-assets/social/instagram-post-template.png'))

// ---------- print ----------
await png(wordmark.colour, 300, 'brand-assets/print/email-signature.png')
await png(wordmark.colour, 600, 'brand-assets/print/letterhead-logo.png')
await png(wordmark.colour, 400, 'brand-assets/print/invoice-logo.png')
await render(wordmark.monoWhite, 1200)
  .ensureAlpha()
  .composite([
    {
      input: Buffer.from([255, 255, 255, 38]),
      raw: { width: 1, height: 1, channels: 4 },
      tile: true,
      blend: 'dest-in',
    },
  ])
  .png()
  .toFile(out('brand-assets/print/watermark.png'))

console.log('brand assets built')
