import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PageMeta } from '@/shared/api/types.gen'
import { Button } from '@/shared/ui/primitives/button'

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PageMeta | undefined
  onPageChange: (page: number) => void
}) {
  if (!meta || meta.total <= meta.page_size) return null

  const pages = Math.max(1, Math.ceil(meta.total / meta.page_size))

  return (
    <nav aria-label="Постраничная навигация" className="flex items-center justify-between gap-4">
      <p className="text-muted-foreground text-sm">
        Страница {meta.page} из {pages} · всего {meta.total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="size-4" />
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.has_next}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Вперёд
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
