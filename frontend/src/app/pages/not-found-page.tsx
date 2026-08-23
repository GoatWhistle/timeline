import { Link } from 'react-router'
import { Button } from '@/shared/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="font-semibold text-xl">Страница не найдена</h1>
      <p className="text-muted-foreground text-sm">Проверьте адрес или вернитесь на главную.</p>
      <Button asChild variant="outline">
        <Link to="/">На главную</Link>
      </Button>
    </div>
  )
}
