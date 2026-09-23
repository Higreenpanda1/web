import {
  BadgeCheck,
  Building2,
  Calculator,
  ClipboardCheck,
  Factory,
  FileCheck2,
  FilePen,
  IdCard,
  Landmark,
  Lightbulb,
  MapPin,
  Package,
  Plane,
  Route,
  Search,
  Ship,
  ShoppingCart,
  Store,
  Tent,
  Users,
  Wallet,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'
import type { ServiceCategory, ServiceIconName } from '@/lib/catalogue'
import type { Service } from '@/payload-types'

/**
 * One icon family throughout, single weight, 1.5px stroke with rounded caps —
 * matching the play mark's construction (brief section 15).
 */
const ICONS: Record<ServiceIconName, LucideIcon> = {
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
  plane: Plane,
  'file-check': FileCheck2,
  'id-card': IdCard,
  users: Users,
  landmark: Landmark,
  wallet: Wallet,
  store: Store,
  calculator: Calculator,
  'map-pin': MapPin,
  'badge-check': BadgeCheck,
  'file-pen': FilePen,
}

/** The icon that stands for a whole category on the index and the homepage. */
export const CATEGORY_ICON: Record<ServiceCategory, ServiceIconName> = {
  import: 'route',
  company: 'building',
  banking: 'landmark',
  ecommerce: 'store',
  visas: 'plane',
  consulting: 'lightbulb',
}

export function ServiceIcon({
  name,
  size = 28,
  className,
}: {
  name: Service['icon'] | ServiceIconName | null | undefined
  size?: number
  className?: string
}) {
  const Icon = ICONS[(name ?? 'package') as ServiceIconName] ?? Package
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
