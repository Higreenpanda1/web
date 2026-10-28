import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

/**
 * Turns one of our printable pages (quote, invoice, proforma) into a PDF,
 * the same one the team gets from "Print / Save as PDF", so a copy can go
 * into the client's HubSpot deal.
 *
 * It runs the Chromium that the production image installs (with Chinese and
 * Arabic fonts, see Dockerfile) in headless mode, on a temporary file. The
 * page's images are under /public, which a file:// page cannot reach, so they
 * are inlined as data URIs first. CHROMIUM_PATH overrides where it is.
 */

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

/** Every src="/…" of a file under /public, as a data URI. Unknown files are left as they are. */
export async function inlinePublicImages(html: string, publicDir: string): Promise<string> {
  const sources = [...new Set([...html.matchAll(/src="(\/[^"]+)"/g)].map((m) => m[1] as string))]
  let out = html
  for (const src of sources) {
    const file = path.join(publicDir, path.normalize(src))
    const mime = MIME[path.extname(file).toLowerCase()]
    if (!mime || !file.startsWith(publicDir + path.sep)) continue
    const content = await readFile(file).catch(() => null)
    if (!content) continue
    out = out.replaceAll(`src="${src}"`, `src="data:${mime};base64,${content.toString('base64')}"`)
  }
  return out
}

export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const dir = await mkdtemp(path.join(tmpdir(), 'hgp-pdf-'))
  try {
    const input = path.join(dir, 'page.html')
    const output = path.join(dir, 'page.pdf')
    await writeFile(input, await inlinePublicImages(html, path.join(process.cwd(), 'public')))
    await run(
      process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-sync',
        '--no-pdf-header-footer',
        `--user-data-dir=${path.join(dir, 'profile')}`,
        `--print-to-pdf=${output}`,
        `file://${input}`,
      ],
      { timeout: 60_000, env: { ...process.env, HOME: dir } },
    )
    return new Uint8Array(await readFile(output))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
