import 'dotenv/config'

/**
 * Run one automation job by hand. The scheduler (src/instrumentation.ts) runs
 * the same functions on a timer inside the app; this is for running one now,
 * from the `tools` container or a developer machine:
 *
 *   npm run posts:distribute   announce articles that have gone live
 *   npm run posts:enrich       takeaways + questions for articles lacking them
 *   npm run posts:translate    English draft for one Arabic-only article
 *   npm run posts:draft        one new bilingual draft from the content queue
 *   npm run seo:indexnow       submit every live URL to IndexNow once
 *
 * Add `-- --dry-run` to distribute to see what would be announced.
 */
async function main() {
  const [command, ...flags] = process.argv.slice(2)
  const dryRun = flags.includes('--dry-run')

  switch (command) {
    case 'distribute': {
      const { distributeNewPosts } = await import('@/lib/automation/distribute')
      const { announced } = await distributeNewPosts({ dryRun })
      console.log(
        announced.length ? `announced: ${announced.join(', ')}` : 'nothing new to announce',
      )
      break
    }
    case 'enrich': {
      requireKey()
      const { enrichPosts } = await import('@/lib/automation/drafts')
      const limit = Number(
        flags.find((flag) => /^\d+$/.test(flag)) ?? process.env.ENRICH_BATCH ?? '3',
      )
      await enrichPosts(limit)
      break
    }
    case 'translate': {
      requireKey()
      const { translateMissing } = await import('@/lib/automation/drafts')
      const limit = Number(flags.find((flag) => /^\d+$/.test(flag)) ?? '1')
      await translateMissing(limit)
      break
    }
    case 'draft': {
      requireKey()
      const { draftFromQueue } = await import('@/lib/automation/drafts')
      await draftFromQueue()
      break
    }
    case 'indexnow': {
      const { submitEverythingToIndexNow } = await import('@/lib/automation/distribute')
      const count = await submitEverythingToIndexNow()
      console.log(
        count
          ? `submitted ${count} URLs`
          : 'IndexNow is not configured (INDEXNOW_KEY) or the site is not on https',
      )
      break
    }
    default:
      console.error(
        'usage: npm run automation -- <distribute|enrich|translate|draft|indexnow> [--dry-run] [n]',
      )
      process.exit(2)
  }
  process.exit(0)
}

function requireKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set. Add it to .env to run the content jobs.')
    process.exit(2)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
