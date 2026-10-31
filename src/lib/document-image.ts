import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { inlinePublicImages } from './pdf'
const run = promisify(execFile)
/** A long PNG of the complete billing document, without interactive controls. */
export async function htmlToPng(html: string): Promise<Uint8Array> {
  const dir = await mkdtemp(path.join(tmpdir(), 'hgp-png-'))
  try {
    const input = path.join(dir, 'page.html')
    const output = path.join(dir, 'page.png')
    const content = html.replace('</head>', '<style>#print,.pdf-download,.document-downloads{display:none!important}html,body{background:white!important}body{margin:32px!important}</style></head>')
    await writeFile(input, await inlinePublicImages(content, path.join(process.cwd(), 'public')))
    await run(process.env.CHROMIUM_PATH || '/usr/bin/chromium', [
      '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--no-first-run', '--disable-extensions', '--disable-background-networking',
      '--disable-component-update', '--disable-sync', '--hide-scrollbars',
      '--window-size=1600,8000', '--virtual-time-budget=3000',
      '--user-data-dir=' + path.join(dir, 'profile'),
      '--screenshot=' + output, 'file://' + input,
    ], { timeout: 60000, env: { ...process.env, HOME: dir } })
    return new Uint8Array(await sharp(await readFile(output)).trim({ background: '#ffffff', threshold: 8 }).extend({ top: 24, bottom: 24, left: 24, right: 24, background: '#ffffff' }).png().toBuffer())
  } finally { await rm(dir, { recursive: true, force: true }) }
}
