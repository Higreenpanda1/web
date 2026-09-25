import Anthropic from '@anthropic-ai/sdk'

/**
 * One client for every content job. The model is `claude-opus-5` unless
 * ANTHROPIC_MODEL says otherwise; every call uses adaptive thinking and a
 * structured output schema, so a malformed answer is a parse error we log,
 * never half a document saved.
 */
export const MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-opus-5'

let client: Anthropic | null = null

export function anthropic(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

export function contentJobsEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}
