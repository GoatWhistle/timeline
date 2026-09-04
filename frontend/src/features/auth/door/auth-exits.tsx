import { Link } from 'react-router'
import { Button } from '@/shared/ui/primitives/button'

export type AuthExit = {
  to: string
  label: string
}

export function AuthExits({ exits }: { exits: readonly AuthExit[] }) {
  return (
    <div className="grid gap-2 border-border border-t pt-4 sm:grid-cols-2">
      {exits.map((exit) => (
        <Button key={exit.to} asChild variant="outline" className="w-full">
          <Link to={exit.to}>{exit.label}</Link>
        </Button>
      ))}
    </div>
  )
}
