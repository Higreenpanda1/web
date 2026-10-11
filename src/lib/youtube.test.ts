import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseFeed } from './youtube.ts'

const entry = (id: string, title: string) => `<entry>
  <id>yt:video:${id}</id>
  <yt:videoId>${id}</yt:videoId>
  <title>${title}</title>
  <published>2026-10-01T10:00:00+00:00</published>
</entry>`

const feed = `<?xml version="1.0"?><feed><title>HiGreenPanda</title>
${entry('aaaaaaaaaaa', 'جولة في معرض كانتون &amp; المصانع')}
${entry('bad', 'not a video')}
${entry('bbbbbbbbbbb', 'Yiwu market')}
${entry('ccccccccccc', 'Third')}
</feed>`

test('reads videos in feed order, skipping malformed ids', () => {
  const videos = parseFeed(feed, 5)
  assert.deepEqual(
    videos.map((v) => v.id),
    ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'],
  )
  assert.equal(videos[0]?.title, 'جولة في معرض كانتون & المصانع')
  assert.equal(videos[0]?.url, 'https://www.youtube.com/watch?v=aaaaaaaaaaa')
  assert.equal(videos[0]?.thumbnail, 'https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg')
})

test('stops at the limit', () => {
  assert.equal(parseFeed(feed, 2).length, 2)
})

test('the channel title is not mistaken for a video', () => {
  assert.equal(parseFeed('<feed><title>x</title></feed>', 5).length, 0)
})
