import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const batchRoot = path.resolve(here, '../seed/editorial-2026-11')
const prefix = 'editorial-2026-11:'
const stable = value => {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).filter(key => key !== 'id').sort().map(key => [key, stable(value[key])]))
  return value
}
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b))

/** Only this batch is imported. The general site seed and social scheduler are not invoked. */
export async function importBatch(payload, pack, options = {}) {
  const { apply = false, publish = false, root = batchRoot } = options
  const result = []
  const resolved = []
  // Preflight the whole pack before any mutation.
  for (const post of pack.posts) {
    if (!['ar', 'en', 'zh'].includes(post.locale ?? 'ar')) throw new Error(`Invalid locale: ${post.locale}`)
    if (!existsSync(path.join(root, post.cover.file))) throw new Error(`Missing cover: ${post.slug}`)
    const [found, services, categories] = await Promise.all([
      payload.find({ collection: 'posts', where: { slug: { equals: post.slug } }, limit: 1, depth: 0, locale: post.locale ?? 'ar', draft: true }),
      payload.find({ collection: 'services', where: { slug: { equals: post.service } }, limit: 1, depth: 0 }),
      payload.find({ collection: 'categories', where: { slug: { equals: post.category } }, limit: 1, depth: 0 }),
    ])
    const current = found.docs[0]
    if (current && !current.importKey?.startsWith(prefix)) throw new Error(`Slug already belongs to another article: ${post.slug}`)
    if (!services.docs[0] || !categories.docs[0]) throw new Error(`Missing service/category: ${post.slug}`)
    const fingerprint = prefix + createHash('sha256').update(JSON.stringify(post)).update(readFileSync(path.join(root, post.cover.file))).digest('hex')
    // Never overwrite a published article or a subsequent editor change.
    if (current && current.importKey !== fingerprint) throw new Error(`Existing article changed; inspect before updating: ${post.slug}`)
    if (current && publish && (
      current.title !== post.title || current.excerpt !== post.excerpt ||
      !same(current.body, post.body) || !same(current.faqs, post.faqs) ||
      !same(current.sources, post.sources)
    )) throw new Error(`Editor changed draft; inspect before publishing: ${post.slug}`)
    resolved.push({ post, current, fingerprint, service: services.docs[0].id, category: categories.docs[0].id })
  }
  for (const { post, current, fingerprint, service, category } of resolved) {
    if (current) {
      if (apply && publish && current._status === 'draft') {
        await payload.update({ collection: 'posts', id: current.id, locale: post.locale ?? 'ar', data: { _status: 'published', publishedAt: new Date().toISOString() } })
        result.push({ slug: post.slug, action: 'published-existing-batch-draft', id: current.id })
      } else result.push({ slug: post.slug, action: 'already-imported', id: current.id })
      continue
    }
    if (!apply) { result.push({ slug: post.slug, action: publish ? 'would-create-published' : 'would-create-draft' }); continue }
    const mediaName = path.basename(post.cover.file)
    const mediaResult = await payload.find({ collection: 'media', where: { filename: { equals: mediaName } }, limit: 1, depth: 0 })
    const media = mediaResult.docs[0] ?? await payload.create({
      collection: 'media', locale: post.locale ?? 'ar', filePath: path.join(root, post.cover.file),
      data: { alt: post.cover.alt, caption: post.cover.caption, credit: post.cover.credit },
    })
    const created = await payload.create({ collection: 'posts', locale: post.locale ?? 'ar', data: {
      slug: post.slug, title: post.title, excerpt: post.excerpt, body: post.body,
      focusKeyword: post.focusKeyword, keyTakeaways: post.keyTakeaways.map(text => ({ text })),
      faqs: post.faqs, sources: post.sources, seo: { description: post.seoDescription },
      coverImage: media.id, categories: [category], ctaService: service,
      localesAvailable: [post.locale ?? 'ar'], importKey: fingerprint,
      publishedAt: new Date().toISOString(), _status: publish ? 'published' : 'draft',
    } })
    result.push({ slug: post.slug, action: publish ? 'created-published' : 'created-draft', id: created.id })
  }
  return result
}

async function main() {
  await import('dotenv/config')
  const { getPayload } = await import('payload')
  const { default: config } = await import('../payload.config.ts')
  const payload = await getPayload({ config })
  try {
    const pack = JSON.parse(readFileSync(path.join(batchRoot, process.argv.includes('--multilingual') ? 'posts-multilingual.json' : 'posts.json'), 'utf8'))
    const apply = process.argv.includes('--apply')
    const publish = process.argv.includes('--publish')
    if (publish && !apply) throw new Error('--publish requires --apply; use no flags for preflight')
    console.log(JSON.stringify({ mode: apply ? (publish ? 'publish' : 'drafts') : 'dry-run', result: await importBatch(payload, pack, { apply, publish }) }, null, 2))
  } finally { await payload.destroy() }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
