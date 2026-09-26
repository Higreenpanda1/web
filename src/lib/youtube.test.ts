import assert from 'node:assert/strict'
import { test } from 'node:test'

const { parseFeed } = await import('./youtube.ts')

const entry = (id: string, title: string) => `
  <entry>
    <id>yt:video:${id}</id>
    <yt:videoId>${id}</yt:videoId>
    <title>${title}</title>
    <published>2026-09-20T10:00:00+00:00</published>
  </entry>`

test('parseFeed reads the newest videos in feed order, up to the limit', () => {
  const xml = `<feed><title>HiGreenPanda</title>${entry('aaaaaaaaaaa', 'First')}${entry('bbbbbbbbbbb', 'Second &amp; more')}${entry('ccccccccccc', 'Third')}${entry('ddddddddddd', 'Fourth')}</feed>`
  const videos = parseFeed(xml, 3)
  assert.deepEqual(
    videos.map((video) => video.id),
    ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'],
  )
  assert.equal(videos[1]?.title, 'Second & more')
  assert.equal(videos[0]?.url, 'https://www.youtube.com/watch?v=aaaaaaaaaaa')
  assert.equal(videos[0]?.thumbnail, 'https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg')
})

test('parseFeed returns nothing for an empty or broken feed', () => {
  assert.deepEqual(parseFeed('', 3), [])
  assert.deepEqual(parseFeed('<feed><entry><title>x</title></entry></feed>', 3), [])
})
