import 'dotenv/config'

/**
 * Run one automation job by hand. The scheduler (src/instrumentation.ts) runs
 * the same functions on a timer inside the app; this is for running one now,
 * from the `tools` container or a developer machine:
 *
 *   npm run posts:distribute   announce articles that have gone live
 *   npm run posts:enrich       takeaways + questions for articles lacking them
 *   npm run posts:translate    English draft for one Arabic-only article
 *   npm run posts:research     weekly market research → new topics in the queue
 *   npm run posts:draft        one new bilingual article from the content queue
 *   npm run posts:digest       the weekly summary email to the owner
 *   npm run posts:plan-pack    the research brief, for a session without the API
 *   npm run posts:write-packs  writing briefs from .plan/topics.json
 *   npm run posts:write-apply  validate .write/out/*.json into src/seed/wp/posts.json
 *   npm run seo:indexnow       submit every live URL to IndexNow once
 *   npm run posts:rewrite-archive -- [n] [--slug=x] [--parallel=3] [--force]
 *                              rewrite the recovered archive (src/seed/wp/posts.json)
 *
 * Add `-- --dry-run` to distribute, research, draft or digest to see what
 * would happen without writing anything.
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
      const count = Number(flags.find((flag) => /^\d+$/.test(flag)) ?? '1') || 1
      for (let i = 0; i < count; i++) {
        const outcome = await draftFromQueue({ dryRun })
        if (!outcome && !dryRun) break
      }
      break
    }
    case 'research': {
      requireKey()
      const { researchTopics } = await import('@/lib/automation/research/plan')
      const limit = Number(flags.find((flag) => /^\d+$/.test(flag)) ?? '0') || undefined
      const result = await researchTopics({ limit, dryRun })
      if (result) {
        console.log(result.report)
        console.log(
          `\n${dryRun ? 'would queue' : 'queued'} ${result.added.length} topic(s), skipped ${result.skipped.length}`,
        )
      }
      break
    }
    case 'plan-pack': {
      const { writePlanPack } = await import('@/lib/automation/offline')
      const dir = flags.find((flag) => flag.startsWith('--dir='))?.slice(6) ?? '.plan'
      console.log(`wrote ${writePlanPack(dir)} — research, then write ${dir}/topics.json`)
      break
    }
    case 'write-packs': {
      const { writeArticlePacks } = await import('@/lib/automation/offline')
      const dir = flags.find((flag) => flag.startsWith('--dir='))?.slice(6) ?? '.write'
      const planDir = flags.find((flag) => flag.startsWith('--plan='))?.slice(7) ?? '.plan'
      const result = writeArticlePacks({ planDir, dir })
      console.log(
        `wrote ${result.written} writing pack(s) to ${dir}/packs` +
          (result.rejected.length ? `\nrejected:\n- ${result.rejected.join('\n- ')}` : ''),
      )
      break
    }
    case 'write-apply': {
      const { applyArticles } = await import('@/lib/automation/offline')
      const dir = flags.find((flag) => flag.startsWith('--dir='))?.slice(6) ?? '.write'
      const from = flags.find((flag) => flag.startsWith('--from='))?.slice(7)
      const result = await applyArticles({
        dir,
        from: from ? new Date(from) : undefined,
        verify: !flags.includes('--no-verify'),
      })
      for (const item of result.applied) {
        console.log(
          `applied ${item.slug} → live ${item.publishedAt.slice(0, 16)}Z (${item.words[0]}/${item.words[1]} words)`,
        )
      }
      if (result.rejected.length) console.log(`notes:\n- ${result.rejected.join('\n- ')}`)
      console.log(`${result.applied.length} applied; commit src/seed/wp/posts.json and deploy`)
      break
    }
    case 'digest': {
      const { sendWeeklyDigest } = await import('@/lib/automation/digest')
      console.log(await sendWeeklyDigest({ dryRun }))
      break
    }
    case 'rewrite-archive': {
      requireKey()
      const { rewriteArchive } = await import('@/lib/automation/rewrite')
      const limit = Number(flags.find((flag) => /^\d+$/.test(flag)) ?? '0') || undefined
      const only = flags.find((flag) => flag.startsWith('--slug='))?.slice(7)
      const concurrency = Number(
        flags.find((flag) => flag.startsWith('--parallel='))?.slice(11) ?? '3',
      )
      const done = await rewriteArchive({
        limit,
        only,
        concurrency,
        force: flags.includes('--force'),
      })
      console.log(`rewrote ${done} article version(s); commit src/seed/wp/posts.json and deploy`)
      break
    }
    case 'rewrite-packs': {
      const { writePacks } = await import('@/lib/automation/rewrite-files')
      const dir = flags.find((flag) => flag.startsWith('--dir='))?.slice(6) ?? '.rewrites'
      const count = writePacks(dir)
      console.log(`wrote ${count} source packs to ${dir}/packs`)
      break
    }
    case 'translate-packs': {
      const { writeTranslationPacks } = await import('@/lib/automation/rewrite-files')
      const dir = flags.find((flag) => flag.startsWith('--dir='))?.slice(6) ?? '.translate'
      console.log(`wrote ${writeTranslationPacks(dir)} translation packs to ${dir}/packs`)
      break
    }
    case 'rewrite-apply': {
      const { applyRewrites } = await import('@/lib/automation/rewrite-files')
      const dir = flags.find((flag) => flag.startsWith('--dir='))?.slice(6) ?? '.rewrites'
      const result = applyRewrites(dir)
      console.log(
        `applied ${result.applied}, rejected ${result.rejected.length}` +
          (result.rejected.length ? `\n` + result.rejected.join('\n') : ''),
      )
      break
    }
    case 'links-packs': {
      const { writeLinkPacks } = await import('@/lib/automation/interlink')
      const dir = flags.find((flag) => flag.startsWith('--dir='))?.slice(6) ?? '.links'
      console.log(`wrote ${writeLinkPacks(dir)} link packs to ${dir}/packs`)
      break
    }
    case 'links-apply': {
      const { applyLinkEdits } = await import('@/lib/automation/interlink')
      const dir = flags.find((flag) => flag.startsWith('--dir='))?.slice(6) ?? '.links'
      const result = applyLinkEdits(dir)
      console.log(
        `applied ${result.applied} link(s), rejected ${result.rejected.length}` +
          (result.rejected.length ? '\n' + result.rejected.join('\n') : ''),
      )
      break
    }
    case 'publish': {
      // Publish articles by slug, e.g. drafts the import will not publish on
      // its own (it never re-publishes what is a draft in the CMS).
      const slugs = flags.filter((flag) => !flag.startsWith('--'))
      if (slugs.length === 0) {
        console.error('usage: npm run posts:publish -- <slug> [slug…]')
        process.exit(2)
      }
      const { getPayloadClient } = await import('@/lib/payload')
      const payload = await getPayloadClient()
      for (const slug of slugs) {
        const found = await payload.find({
          collection: 'posts',
          where: { slug: { equals: slug } },
          limit: 1,
          depth: 0,
          draft: true,
        })
        const post = found.docs[0]
        if (!post) {
          console.log(`${slug}: not found`)
          continue
        }
        for (const locale of (post.localesAvailable ?? ['ar']) as Array<'ar' | 'en'>) {
          await payload.update({
            collection: 'posts',
            id: post.id,
            locale,
            depth: 0,
            data: { _status: 'published' },
          })
        }
        console.log(`${slug}: published`)
      }
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
        'usage: npm run automation -- <distribute|enrich|translate|research|draft|digest|publish|indexnow|rewrite-archive|rewrite-packs|rewrite-apply|links-packs|links-apply|translate-packs> [--dry-run] [n]',
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
