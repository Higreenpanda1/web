/**
 * The most recent positive number in a Metricool timeline. The response nests
 * `{ dateTime, value }` points under `data` (and sometimes `values`); walking
 * the whole tree keeps this working if the nesting shifts.
 */
export function latestValue(body: unknown): number | null {
  let best: { at: string; value: number } | null = null
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    const at = record.dateTime ?? record.date ?? record.day
    const value = Number(record.value)
    if (typeof at === 'string' && Number.isFinite(value) && value > 0) {
      if (!best || at > best.at) best = { at, value }
    }
    Object.values(record).forEach(visit)
  }
  visit(body)
  return best ? Math.round((best as { value: number }).value) : null
}
