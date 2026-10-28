import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import { inlinePublicImages } from './pdf.ts'

test('images under /public are inlined, anything else is left alone', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hgp-public-'))
  await mkdir(path.join(dir, 'brand'))
  await writeFile(path.join(dir, 'brand', 'logo.png'), Buffer.from([1, 2, 3]))
  const html = await inlinePublicImages(
    '<img src="/brand/logo.png"><img src="/brand/logo.png"><img src="/missing.png"><img src="/../etc/passwd.png">',
    dir,
  )
  assert.equal(html.split('src="data:image/png;base64,AQID"').length, 3)
  assert.ok(html.includes('src="/missing.png"'))
  assert.ok(html.includes('src="/../etc/passwd.png"'))
})
