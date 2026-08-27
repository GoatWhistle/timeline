import { Spinner } from '@/shared/ui/data-display/spinner'

export function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24 opacity-60">
      <Spinner className="size-5" label="Загрузка страницы" />
    </div>
  )
}
