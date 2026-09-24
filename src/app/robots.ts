import { serverURL } from '@/lib/env'

import type { MetadataRoute } from 'next'

/**
 * Everyone may read the content; nobody needs the admin panel or the API.
 *
 * The AI crawlers are listed by name and allowed explicitly. Being cited by
 * ChatGPT, Claude, Perplexity and Google's AI answers is a traffic channel for
 * a blog whose readers ask "how do I import from China" in plain words, and a
 * crawler that finds no rule for itself may assume the cautious default. Each
 * gets the same rule as everyone else — the content, not the machinery.
 */
const PRIVATE_PATHS = ['/hgp-studio', '/hgp-studio-gate', '/api/', '/gone']

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'meta-externalagent',
  'Bytespider',
  'CCBot',
  'DuckAssistBot',
  'YouBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow: PRIVATE_PATHS })),
    ],
    sitemap: `${serverURL}/sitemap.xml`,
    host: serverURL,
  }
}
