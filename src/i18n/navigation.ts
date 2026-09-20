import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/**
 * Locale-aware Link/redirect/router. Importing these instead of `next/link`
 * is what keeps `/en` on English links without every component knowing the
 * current locale.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
