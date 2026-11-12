import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { importBatch, batchRoot } from '../src/scripts/import-editorial-2026-11.mjs'

const pack = JSON.parse(readFileSync(path.join(batchRoot, 'posts.json'), 'utf8'))
function mock(current = null, missingService = false) {
  const writes = []
  const api = {
    async find({ collection }) {
      if (collection === 'posts') return { docs: current ? [current] : [] }
      if (collection === 'services' && missingService) return { docs: [] }
      return { docs: collection === 'media' ? [] : [{ id: 1 }] }
    },
    async create(args) { writes.push(args); return { id: writes.length } },
    async update(args) { writes.push(args); return { id: args.id } },
  }
  return { api, writes }
}
test('dry run validates all six posts without creating media or articles', async () => {
  const { api, writes } = mock()
  const result = await importBatch(api, pack)
  assert.equal(result.length, 6)
  assert.ok(result.every(x => x.action === 'would-create-draft'))
  assert.equal(writes.length, 0)
})
test('default apply creates Arabic-only drafts with correct service links', async () => {
  const { api, writes } = mock()
  await importBatch(api, pack, { apply: true })
  const articles = writes.filter(x => x.collection === 'posts')
  assert.equal(articles.length, 6)
  assert.ok(articles.every(x => x.data._status === 'draft'))
  assert.ok(articles.every(x => x.data.localesAvailable.join() === 'ar'))
  assert.ok(articles.every(x => x.data.coverImage && x.data.ctaService))
  assert.equal(writes.filter(x => !['posts', 'media'].includes(x.collection)).length, 0)
})
test('publishing is explicit and does not call any social or scheduler action', async () => {
  const { api, writes } = mock()
  const result = await importBatch(api, pack, { apply: true, publish: true })
  assert.equal(result.length, 6)
  assert.ok(writes.filter(x => x.collection === 'posts').every(x => x.data._status === 'published'))
})
test('slug collision aborts preflight before any writes', async () => {
  const { api, writes } = mock({ id: 20, importKey: 'another-editor' })
  await assert.rejects(importBatch(api, pack, { apply: true }), /belongs to another article/)
  assert.equal(writes.length, 0)
})
test('missing service aborts preflight before uploads', async () => {
  const { api, writes } = mock(null, true)
  await assert.rejects(importBatch(api, pack, { apply: true }), /Missing service/)
  assert.equal(writes.length, 0)
})
test('same imported batch is idempotent', async () => {
  const post = pack.posts[0]
  const importKey = 'editorial-2026-11:' + createHash('sha256').update(JSON.stringify(post)).update(readFileSync(path.join(batchRoot, post.cover.file))).digest('hex')
  const { api, writes } = mock({ id: 10, importKey, _status: 'draft' })
  const result = await importBatch(api, { posts: [post] }, { apply: true })
  assert.equal(result[0].action, 'already-imported')
  assert.equal(writes.length, 0)
})
test('edited batch draft cannot be silently published', async () => {
  const post = pack.posts[0]
  const importKey = 'editorial-2026-11:' + createHash('sha256').update(JSON.stringify(post)).update(readFileSync(path.join(batchRoot, post.cover.file))).digest('hex')
  const { api, writes } = mock({ ...post, id: 10, importKey, title: 'Edited title', _status: 'draft' })
  await assert.rejects(importBatch(api, { posts: [post] }, { apply: true, publish: true }), /Editor changed draft/)
  assert.equal(writes.length, 0)
})
