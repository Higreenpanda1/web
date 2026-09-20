/**
 * A small fixed-window limiter held in process memory.
 *
 * Deliberately not Redis: this site runs as one container on one VPS, so a
 * shared store would add a dependency and a failure mode for no gain. If the
 * app is ever scaled to more than one instance, replace the Map with Redis and
 * nothing that calls `consume` has to change.
 *
 * The limiter is one of three layers on the enquiry form — the honeypot and the
 * timing check are in src/lib/form-guard.ts — because the point is to make
 * automated submission expensive, not to catch every one.
 */

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/** Stop the Map growing without bound on a long-running process. */
const MAX_TRACKED_KEYS = 10_000

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

export function consume(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  pruneExpired(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt, retryAfterSeconds: 0 }
  }

  existing.count += 1
  const allowed = existing.count <= limit
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  }
}

function pruneExpired(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) {
    // Cheap path: only sweep when the map is actually large.
    return
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  // If everything is still live, drop the oldest entries rather than grow.
  if (buckets.size >= MAX_TRACKED_KEYS) {
    const sorted = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
    for (const [key] of sorted.slice(0, Math.floor(MAX_TRACKED_KEYS / 4))) buckets.delete(key)
  }
}

/**
 * How many attempts are left without recording one.
 *
 * Used where only failures should count against the budget — signing in
 * successfully is not evidence of an attack, and charging for it means an
 * admin who signs in and out a few times locks themselves out of their own
 * site.
 */
export function peek(key: string, limit: number, now = Date.now()): RateLimitResult {
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    return { allowed: true, remaining: limit, resetAt: now, retryAfterSeconds: 0 }
  }
  const allowed = existing.count < limit
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  }
}

/** Test seam. */
export function __reset(): void {
  buckets.clear()
}

/**
 * Truncate an address to its network prefix: /24 for IPv4, /48 for IPv6. Used
 * both as the rate-limit key and as the only part of an address ever written to
 * the database — enough to spot a flood from one network, not enough to track a
 * person.
 */
export function networkPrefix(ip: string | null | undefined): string {
  if (!ip) return 'unknown'
  const address = ip.split(',')[0]?.trim() ?? ''
  if (address.includes(':')) {
    const groups = address.split(':').filter(Boolean)
    return `${groups.slice(0, 3).join(':')}::/48`
  }
  const octets = address.split('.')
  if (octets.length !== 4) return 'unknown'
  return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`
}
