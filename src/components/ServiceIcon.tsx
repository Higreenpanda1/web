import {
  Building2,
  ClipboardCheck,
  Factory,
  Lightbulb,
  Package,
  Route,
  Search,
  Ship,
  ShoppingCart,
  Tent,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'
import type { Service } from '@/payload-types'

/**
 * One icon family throughout, single weight, 1.5px stroke with rounded caps —
 * matching the play mark's construction (brief section 15).
 */
const ICONS: Record<NonNullable<Service['icon']>, LucideIcon> = {
  search: Search,
  factory: Factory,
  'clipboard-check': ClipboardCheck,
  ship: Ship,
  building: Building2,
  route: Route,
  'shopping-cart': ShoppingCart,
  lightbulb: Lightbulb,
  tent: Tent,
  package: Package,
}

export function ServiceIcon({
  name,
  size = 28,
  className,
}: {
  name: Service['icon']
  size?: number
  className?: string
}) {
  const Icon = ICONS[name ?? 'package'] ?? Package
  return (
    <Icon
      size={size}
      strokeWidth={1.5}
      absoluteStrokeWidth
      className={className}
      aria-hidden="true"
      focusable="false"
    />
  )
}
