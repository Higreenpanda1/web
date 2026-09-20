/* THIS FILE IS PART OF THE PAYLOAD ADMIN SHELL.
 *
 * Payload's REST API. GraphQL is disabled in the config and has no route here,
 * because nothing on this site queries it and an open GraphQL endpoint hands
 * out the whole schema for free.
 */
import config from '@payload-config'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
