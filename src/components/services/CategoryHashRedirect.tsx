'use client'

import { useEffect } from 'react'

import { SERVICE_CATEGORIES } from '@/lib/catalogue'
import { categoryHref } from '@/lib/service-company'

/**
 * Old links such as `/services#banking` (blog posts, bookmarks, search
 * results) were written when the index listed every area on one page. The
 * fragment never reaches the server, so the browser sends them on to the
 * company that offers that area.
 */
export function CategoryHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const category = SERVICE_CATEGORIES.find((entry) => entry === hash)
    if (category)
      window.location.replace(
        window.location.pathname + categoryHref(category).slice('/services'.length),
      )
  }, [])
  return null
}
