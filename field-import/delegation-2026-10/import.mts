// Adds the "From the field" visits in ./events.json, with their photos from
// ./photos, through Payload's local API. Safe to run twice: a visit whose
// Arabic title already exists is skipped.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'

import config from '../payload.config'

// Copied into src/seed/ of the app before running; the photos stay where
// they were unpacked.
const HERE = process.env.IMPORT_DIR ?? '/import'

type Visit = { kind: string; date: string; ar: string; en: string; zh?: string; photos: string[] }
const visits: Visit[] = JSON.parse(readFileSync(path.join(HERE, 'events.json'), 'utf8'))
// The newest visit leads its card on the homepage.
const HOME = new Set(['2026-10-21'])

const payload = await getPayload({ config })
let added = 0
let skipped = 0
let order = 0
for (const v of visits) {
  const existing = await payload.find({
    collection: 'field-moments',
    locale: 'ar',
    where: { title: { equals: v.ar } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs.length > 0) {
    skipped++
    continue
  }
  const ids: number[] = []
  for (const file of v.photos) {
    const media = await payload.create({
      collection: 'media',
      locale: 'ar',
      data: { alt: v.ar },
      filePath: path.join(HERE, 'photos', file),
    })
    ids.push(media.id as number)
  }
  const home = HOME.has(v.date)
  const doc = await payload.create({
    collection: 'field-moments',
    locale: 'ar',
    data: {
      title: v.ar,
      photos: ids,
      kind: v.kind as 'office',
      takenAt: v.date,
      consentConfirmed: true,
      showOnHome: home,
      order: home ? order++ : 100,
    },
  })
  await payload.update({ collection: 'field-moments', id: doc.id, locale: 'en', data: { title: v.en } })
  if (v.zh) await payload.update({ collection: 'field-moments', id: doc.id, locale: 'zh', data: { title: v.zh } })
  added++
  console.log(`added ${v.date} (${ids.length} photos)`)
}
const total = await payload.count({ collection: 'field-moments' })
console.log(`DONE added=${added} skipped=${skipped} total=${total.totalDocs}`)
process.exit(0)
