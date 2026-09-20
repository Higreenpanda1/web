/* THIS FILE IS PART OF THE PAYLOAD ADMIN SHELL.
 *
 * The directory name IS the admin URL. It is `hgp-studio`, not `admin`, and it
 * must stay in step with `routes.admin` in src/payload.config.ts. See DEPLOY.md
 * before changing it.
 */
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import config from '@payload-config'

import { importMap } from '../importMap'

import type { Metadata } from 'next'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, params, searchParams, importMap })

export default Page
