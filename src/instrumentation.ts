/**
 * Background automation, started once with the server.
 *
 * Next calls `register()` when the Node server boots. Timers set here live for
 * the life of the process, which on the VPS is the life of the `app`
 * container — no separate cron container, no external scheduler, nothing to
 * keep in sync with the code.
 *
 * Two loops:
 *   - every ten minutes: announce articles that have gone live
 *     (src/lib/automation/distribute.ts) — this is what makes scheduled
 *     publishing work end to end
 *   - once a day, in the small hours China time: the content jobs
 *     (src/lib/automation/drafts.ts) — enrich imported articles with takeaways
 *     and questions, translate what is Arabic-only, and write the week's draft
 *     from the content queue. These only run when ANTHROPIC_API_KEY is set.
 *
 * Disabled with AUTOMATION=off, and never started at build time or in the
 * Edge runtime. Each tick is guarded so one failure cannot stop the loop.
 */
export async function register(): Promise<void> {
  // The `if` wrapping the import is load-bearing: Next compiles this file for
  // the Edge runtime as well, and only a statically visible runtime check lets
  // the bundler leave the Node-only scheduler (and Payload behind it) out of
  // that bundle. An early return does not.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NEXT_PHASE === 'phase-production-build') return
    if (process.env.AUTOMATION === 'off') return
    // A DATABASE_URI is the one thing every job needs; without it there is
    // nothing to schedule (unit tests, type generation).
    if (!process.env.DATABASE_URI) return

    const { startScheduler } = await import('./instrumentation-node')
    startScheduler()
  }
}
