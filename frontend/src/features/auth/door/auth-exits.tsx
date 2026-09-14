import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { cn } from '@/shared/styling/class-names/class-names'
import { CrossfadeSwap } from '@/shared/ui/motion/crossfade-swap'
import { Button } from '@/shared/ui/primitives/button'

export type AuthExit = {
  to: string
  label: string
}

export function AuthExits({ exits }: { exits: readonly AuthExit[] }) {
  const { i18n } = useTranslation()

  return (
    <div
      className={cn('grid gap-2 border-border border-t pt-4', exits.length > 1 && 'sm:grid-cols-2')}
    >
      {exits.map((exit) => (
        <Button key={exit.to} asChild variant="outline" className="w-full">
          <Link to={exit.to}>
            <CrossfadeSwap swapKey={i18n.language}>{exit.label}</CrossfadeSwap>
          </Link>
        </Button>
      ))}
    </div>
  )
}
