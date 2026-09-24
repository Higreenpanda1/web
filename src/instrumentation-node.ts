/**
 * Node-only half of src/instrumentation.ts. Kept in its own module so the Edge
 * compilation of `register()` never sees Payload, Postgres or the Anthropic
 * SDK — see the comment there.
 */
export { startScheduler } from '@/lib/automation/scheduler'
