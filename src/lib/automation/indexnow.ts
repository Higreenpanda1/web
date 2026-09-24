import { serverURL } from '@/lib/env'

/**
 * IndexNow: tell Bing, Yandex, Naver, Seznam and Yep about a new or changed URL
 * the moment it changes, instead of waiting for a crawl. Google does not take
 * part; it reads the sitemap, whose lastmod moves on the same publish.
 *
 * The key is a random string the site proves it owns by serving it at
 * /indexnow-key.txt (src/app/indexnow-key.txt/route.ts). Any value of 8 to 128
 * hexadecimal characters works; `openssl rand -hex 16` makes a good one.
 * Without INDEXNOW_KEY the whole feature is silent — nothing else changes.
 */
const ENDPOINT = 'https://api.indexnow.org/IndexNow'

export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim()
  return key && /^[a-f0-9-]{8,128}$/i.test(key) ? key : null
}

export function indexNowEnabled(): boolean {
  return indexNowKey() !== null && serverURL.startsWith('https://')
}

export async function submitToIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number }> {
  const key = indexNowKey()
  if (!key || urls.length === 0) return { ok: false }
  if (!serverURL.startsWith('https://')) return { ok: false }

  const host = new URL(serverURL).host
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `${serverURL}/indexnow-key.txt`,
      // IndexNow accepts up to 10,000 URLs per call; the caller never sends
      // anywhere near that, but slice defensively.
      urlList: urls.slice(0, 10_000),
    }),
    signal: AbortSignal.timeout(10_000),
  })
  // 200 and 202 both mean accepted.
  return { ok: response.status === 200 || response.status === 202, status: response.status }
}
