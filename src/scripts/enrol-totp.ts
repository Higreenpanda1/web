import 'dotenv/config'

import { createInterface } from 'node:readline/promises'

import { getPayload } from 'payload'
import QRCode from 'qrcode'

import config from '../payload.config'
import { hashBackupCode } from '../lib/backup-codes'
import { generateBackupCodes, generateSecret, otpauthUrl, verifyToken } from '../lib/totp'

/**
 * Enrol a staff user's second factor.
 *
 *   npm run totp:enrol -- admin@higreenpanda.com
 *
 * Deliberately a command-line tool rather than a screen in the admin panel: the
 * panel is behind the second factor, so enrolling through it would be circular
 * on the first user, and an attacker who took over a session could otherwise
 * re-enrol their own device. Running this needs shell access to the server.
 *
 * The secret is shown once, verified against a live code before it is saved,
 * and the backup codes are stored as scrypt hashes — so nothing recoverable is
 * left in the database.
 */
async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email) {
    console.error('Usage: npm run totp:enrol -- <email>')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  })

  const user = found.docs[0]
  if (!user) {
    console.error(`No staff user with the email ${email}.`)
    process.exit(1)
  }

  const secret = generateSecret()
  const uri = otpauthUrl(secret, email)

  console.log(`\nEnrolling ${email}\n`)
  console.log(await QRCode.toString(uri, { type: 'terminal', small: true }))
  console.log('If the QR code will not scan, enter this key by hand:\n')
  console.log(`  ${secret.match(/.{1,4}/g)?.join(' ')}\n`)

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const code = (await rl.question('Enter the 6-digit code your app now shows: ')).trim()

  // Verify before saving. Saving an unverified secret is how people lock
  // themselves out of their own admin panel.
  if (!verifyToken(code, secret)) {
    rl.close()
    console.error('\nThat code did not match. Nothing was saved — run the command again.')
    process.exit(1)
  }

  const backupCodes = generateBackupCodes(10)

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      totpSecret: secret,
      totpEnabled: true,
      backupCodes: backupCodes.map((plain) => ({ hash: hashBackupCode(plain) })),
    },
    overrideAccess: true,
  })

  rl.close()

  console.log('\nEnrolled.\n')
  console.log('Backup codes — each works once. Store them somewhere other than this server:\n')
  for (const backupCode of backupCodes) console.log(`  ${backupCode}`)
  console.log('\nThey are stored as hashes and cannot be shown again.')
  console.log('Set ADMIN_REQUIRE_2FA=true and restart to enforce it.\n')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
