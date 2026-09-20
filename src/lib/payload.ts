import config from '@payload-config'
import { getPayload } from 'payload'

import type { Payload } from 'payload'

/**
 * A single Payload instance per process. Every page renders on the server and
 * talks to the database through this local API rather than over HTTP to our own
 * REST endpoints — one less network hop, and access control we can bypass
 * deliberately where the server is the one doing the asking.
 */
let cached: Promise<Payload> | null = null

export function getPayloadClient(): Promise<Payload> {
  if (!cached) cached = getPayload({ config })
  return cached
}
