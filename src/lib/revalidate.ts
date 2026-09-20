import { revalidateTag } from 'next/cache'

import { CACHE_TAGS } from './queries'

import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/**
 * Publishing in the CMS has to show up on the site immediately — the build
 * prompt's definition of success is the client editing an Arabic service page,
 * publishing it, and seeing it live. These hooks drop exactly the cache tag the
 * edited collection owns, so nothing else is re-fetched.
 */

type TagKey = keyof typeof CACHE_TAGS

/**
 * `revalidateTag` only works inside a Next request or render context. These
 * hooks also fire from the seed script, from migrations and from the Payload
 * CLI, where there is no such context and the call throws. There is nothing to
 * invalidate in those cases — no server is serving the cache — so swallowing it
 * is correct rather than merely convenient.
 */
function dropTag(tag: TagKey): void {
  try {
    revalidateTag(CACHE_TAGS[tag])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('static generation store')) return
    throw error
  }
}

export function revalidateCollection(tag: TagKey): {
  afterChange: CollectionAfterChangeHook[]
  afterDelete: CollectionAfterDeleteHook[]
} {
  const drop = () => {
    dropTag(tag)
  }
  return {
    afterChange: [
      ({ doc }) => {
        drop()
        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        drop()
        return doc
      },
    ],
  }
}

export function revalidateGlobal(tag: TagKey): { afterChange: GlobalAfterChangeHook[] } {
  return {
    afterChange: [
      ({ doc }) => {
        dropTag(tag)
        return doc
      },
    ],
  }
}
