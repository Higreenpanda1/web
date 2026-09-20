import { ButtonLink } from '@/components/ui/Button'

type Action = {
  id?: string | null
  label: string
  href: string
  style?: ('primary' | 'secondary' | 'link') | null
}

export function BlockActions({
  actions,
  inverse = false,
}: {
  actions?: Action[] | null
  inverse?: boolean
}) {
  if (!actions || actions.length === 0) return null

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {actions.map((action, index) => (
        <ButtonLink
          key={action.id ?? `${action.href}-${index}`}
          href={action.href}
          size="lg"
          variant={
            action.style === 'secondary'
              ? inverse
                ? 'outline-inverse'
                : 'secondary'
              : action.style === 'link'
                ? 'ghost'
                : inverse
                  ? 'inverse'
                  : 'primary'
          }
        >
          {action.label}
        </ButtonLink>
      ))}
    </div>
  )
}
