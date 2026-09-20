/* THIS FILE IS PART OF THE PAYLOAD ADMIN SHELL.
 * It is the root layout of the (payload) route group, which has its own <html>
 * element separate from the public site's. That separation is deliberate: the
 * public site's global stylesheet, fonts and RTL handling never reach the admin
 * panel, and Payload's stylesheet never reaches the public site.
 */
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import config from '@payload-config'
import React from 'react'

import { importMap } from './hgp-studio/importMap'

import type { ServerFunctionClient } from 'payload'

import '@payloadcms/next/css'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

export default async function Layout({ children }: Args) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  )
}
