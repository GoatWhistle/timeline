import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/shared/ui/primitives/button'

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" aria-hidden="true" />
      <div>
        <h1 className="font-semibold text-xl">Доступ запрещён</h1>
        <p className="text-muted-foreground text-sm">
          Раздел доступен только администратору системы.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">На главную</Link>
      </Button>
    </div>
  )
}
