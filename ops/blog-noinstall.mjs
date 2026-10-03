// The weekly blog's write-apply step, for a session where `npm ci` cannot run
// (the package registry is blocked there, which is what stopped the Saturday
// Routine on 3 October 2026). It needs only Node 22 and this checkout.
//
// It copies the real modules (services, categories, quality gate, Lexical
// conversion) into a temp folder with the two things removed that need
// installed packages — zod and the `@/` path alias — then applies exactly the
// rules of src/lib/automation/offline.ts: schema limits, the quality gate,
// the link inventory, the Sunday/Tuesday/Thursday 09:00 Riyadh publish slots,
// and the same entry shape in src/seed/wp/posts.json.
//
//   node --experimental-strip-types ops/blog-noinstall.mjs list
//   node --experimental-strip-types ops/blog-noinstall.mjs inventory <category> <service> <ar|en>
//   node --experimental-strip-types ops/blog-noinstall.mjs check .write/out
//   node --experimental-strip-types ops/blog-noinstall.mjs apply .write/out
//
// Prefer `npm run posts:write-apply` whenever `npm ci` works; this is the fallback.

import { mkdtempSync, readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARCHIVE = path.join(REPO, 'src/seed/wp/posts.json')

const tmp = mkdtempSync(path.join(tmpdir(), 'blog-noinstall-'))
const copy = (from, to, edit = (s) => s) =>
  writeFileSync(path.join(tmp, to), edit(readFileSync(path.join(REPO, from), 'utf8')))
copy('src/seed/catalogue.ts', 'catalogue.ts', (s) => s.replace(/from '@\/lib\/catalogue'/, "from './nothing.ts'"))
copy('src/seed/content.ts', 'content.ts', (s) => s.replace(/from '\.\/catalogue'/, "from './catalogue.ts'"))
copy('src/lib/automation/research/similarity.ts', 'similarity.ts')
copy('src/lib/automation/quality.ts', 'quality.ts', (s) => s.replace("'./research/similarity.ts'", "'./similarity.ts'"))
copy('src/lib/automation/blocks.ts', 'blocks.ts', (s) =>
  s
    .replace(/import \{ z \} from 'zod\/v4'\n/, '')
    .replace(/export const articleSchema = z\.object\([\s\S]*?\n\}\)\n/, '')
    .replace(/export type ArticleDraft = z\.infer<typeof articleSchema>/, 'export type ArticleDraft = any'),
)
writeFileSync(path.join(tmp, 'nothing.ts'), 'export {}\n')
const load = (name) => import(pathToFileURL(path.join(tmp, name)).href)
const { SERVICES, CATEGORIES } = await load('content.ts')
const { CATALOGUE_SERVICES } = await load('catalogue.ts')
const { blocksToLexical, blocksWordCount } = await load('blocks.ts')
const { checkDraft, stripLinks } = await load('quality.ts')

const ALL = [...SERVICES, ...CATALOGUE_SERVICES]
const archive = JSON.parse(readFileSync(ARCHIVE, 'utf8'))

function inventory(categories, locale, serviceSlug) {
  const prefix = locale === 'en' ? '/en' : ''
  const seen = new Set()
  const lines = []
  const add = (p, title, note = '') => {
    if (seen.has(p)) return
    seen.add(p)
    lines.push(`- ${p} — ${title}${note}`)
  }
  archive.posts
    .filter((post) => post.status === 'published' && post.locales[locale])
    .map((post) => ({ post, shared: post.categories.filter((c) => categories.includes(c)).length, date: post.publishedAt }))
    .sort((a, b) => b.shared - a.shared || b.date.localeCompare(a.date))
    .slice(0, 16)
    .forEach(({ post }) => add(`${prefix}/blog/${post.slug}`, post.locales[locale].title))
  const service = ALL.find((s) => s.slug === serviceSlug)
  if (service) add(`${prefix}/services/${service.slug}`, service[locale].title, ' (the service this article leads to)')
  for (const entry of ALL) add(`${prefix}/services/${entry.slug}`, entry[locale].title, ' (service page)')
  add(`${prefix}/apply/consultation`, locale === 'ar' ? 'حجز استشارة' : 'Book a consultation')
  return { text: lines.join('\n'), allowed: seen }
}

function schemaIssues(article) {
  const out = []
  const len = (v, min, max, name) => {
    if (typeof v !== 'string' || v.length < min || v.length > max) out.push(`${name}: length ${v?.length} not in ${min}-${max}`)
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug ?? '')) out.push('slug is not lower-case-with-hyphens')
  for (const l of ['ar', 'en']) {
    const x = article[l]
    if (!x) {
      out.push(`${l} missing`)
      continue
    }
    len(x.title, 10, 120, `${l}.title`)
    len(x.excerpt, 60, 280, `${l}.excerpt`)
    len(x.seoDescription, 80, 158, `${l}.seoDescription`)
    len(x.focusKeyword, 3, 120, `${l}.focusKeyword`)
    if (!Array.isArray(x.body) || x.body.length < 6) out.push(`${l}.body has fewer than 6 blocks`)
    for (const [i, b] of (x.body ?? []).entries()) {
      if (['h2', 'h3'].includes(b.type) && (typeof b.text !== 'string' || b.text.length < 3)) out.push(`${l}.body[${i}] text`)
      else if (b.type === 'p' && (typeof b.text !== 'string' || !b.text.length)) out.push(`${l}.body[${i}] text`)
      else if (['ul', 'ol'].includes(b.type) && (!Array.isArray(b.items) || !b.items.length)) out.push(`${l}.body[${i}] items`)
      else if (!['h2', 'h3', 'p', 'ul', 'ol'].includes(b.type)) out.push(`${l}.body[${i}] unknown type ${b.type}`)
    }
    if (!Array.isArray(x.keyTakeaways) || x.keyTakeaways.length < 3 || x.keyTakeaways.length > 5) out.push(`${l}.keyTakeaways: 3 to 5`)
    for (const [i, t] of (x.keyTakeaways ?? []).entries()) len(t, 20, 220, `${l}.keyTakeaways[${i}]`)
    if (!Array.isArray(x.faqs) || x.faqs.length < 3 || x.faqs.length > 6) out.push(`${l}.faqs: 3 to 6`)
    for (const [i, f] of (x.faqs ?? []).entries()) {
      len(f.question, 10, 200, `${l}.faqs[${i}].question`)
      len(f.answer, 60, 700, `${l}.faqs[${i}].answer`)
    }
    if (!Array.isArray(x.sources) || x.sources.length < 1 || x.sources.length > 6) out.push(`${l}.sources: 1 to 6`)
    for (const [i, s] of (x.sources ?? []).entries()) {
      len(s.title, 3, 200, `${l}.sources[${i}].title`)
      try {
        new URL(s.url)
      } catch {
        out.push(`${l}.sources[${i}].url is not a URL`)
      }
    }
  }
  return out
}

function nextSlots(from) {
  const taken = new Set(archive.posts.map((p) => p.publishedAt.slice(0, 10)))
  const latest = archive.posts.map((p) => p.publishedAt).filter((d) => d > from.toISOString()).sort().at(-1)
  const cursor = new Date(Math.max(from.getTime(), latest ? new Date(latest).getTime() : 0))
  cursor.setUTCHours(6, 0, 0, 0)
  const days = new Set([0, 2, 4])
  return () => {
    do cursor.setUTCDate(cursor.getUTCDate() + 1)
    while (!days.has(cursor.getUTCDay()) || taken.has(cursor.toISOString().slice(0, 10)))
    taken.add(cursor.toISOString().slice(0, 10))
    return cursor.toISOString()
  }
}

const [mode, ...args] = process.argv.slice(2)

if (mode === 'list') {
  for (const p of [...archive.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)))
    if (p.status === 'published')
      console.log(`${p.publishedAt.slice(0, 10)} [${p.categories.join(',')}] ${p.locales.en?.title ?? ''} | ${p.locales.ar?.title ?? ''}`)
  console.log(`\ncategories: ${CATEGORIES.map((c) => c.slug).join(' ')}`)
  console.log(`services: ${[...new Set(ALL.map((s) => s.slug))].join(' ')}`)
} else if (mode === 'inventory') {
  const [category, service, locale] = args
  console.log(inventory([category], locale, service).text)
} else if (mode === 'check' || mode === 'apply') {
  const dir = path.resolve(args[0] ?? '.write/out')
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
  const slot = nextSlots(new Date())
  let rejected = 0
  for (const name of files) {
    const article = JSON.parse(readFileSync(path.join(dir, name), 'utf8'))
    const issues = schemaIssues(article)
    if (archive.posts.some((p) => p.slug === article.slug)) issues.push(`slug "${article.slug}" already exists`)
    if (!CATEGORIES.some((c) => c.slug === article.category)) issues.push(`unknown category "${article.category}"`)
    if (!ALL.some((s) => s.slug === article.service)) issues.push(`unknown service "${article.service}"`)
    const words = []
    if (!issues.length)
      for (const l of ['ar', 'en']) {
        // Inventory against the archive as it stands, including articles applied earlier in this run — as offline.ts does.
        const inv = inventory([article.category], l, article.service)
        const stripped = stripLinks(article[l].body, inv.allowed)
        if (stripped.removed.length) issues.push(`${l}: links outside the inventory: ${stripped.removed.join(', ')}`)
        const report = checkDraft(article[l], {
          locale: l,
          keyword: article[l].focusKeyword,
          allowedLinks: inv.allowed,
          mustLink: `${l === 'en' ? '/en' : ''}/services/${article.service}`,
        })
        issues.push(...report.issues.map((i) => `${l}: ${i}`))
        words.push(report.words)
      }
    console.log(`${name}: words ${words.join('/') || '-'} ${issues.length ? 'REJECTED\n  ' + issues.join('\n  ') : 'OK'}`)
    if (issues.length) {
      rejected++
      continue
    }
    if (mode === 'apply') {
      const doc = (x) => ({
        legacyId: '',
        title: x.title,
        excerpt: x.excerpt,
        seoDescription: x.seoDescription,
        focusKeyword: x.focusKeyword,
        body: blocksToLexical(x.body),
        wordCount: blocksWordCount(x.body),
        keyTakeaways: x.keyTakeaways,
        faqs: x.faqs,
        sources: x.sources,
        rewrittenAt: new Date().toISOString(),
        rewriteModel: 'editor-session',
      })
      const publishedAt = slot()
      archive.posts.push({
        slug: article.slug,
        publishedAt,
        status: 'published',
        categories: [article.category],
        service: article.service,
        cover: null,
        images: [],
        legacy: {},
        locales: { ar: doc(article.ar), en: doc(article.en) },
      })
      console.log(`  applied, publishes ${publishedAt}`)
    }
  }
  if (mode === 'apply') {
    if (rejected) {
      console.log('\nNothing saved: fix the rejected files and run apply again.')
      process.exit(1)
    }
    writeFileSync(ARCHIVE, JSON.stringify(archive, null, 1) + '\n')
    const applied = path.join(path.dirname(dir), 'applied')
    mkdirSync(applied, { recursive: true })
    for (const name of files) renameSync(path.join(dir, name), path.join(applied, name))
    console.log(`\nSaved ${files.length} article(s) to src/seed/wp/posts.json`)
  }
  if (rejected) process.exit(1)
} else {
  console.log('usage: list | inventory <category> <service> <ar|en> | check <dir> | apply <dir>')
  process.exit(2)
}
