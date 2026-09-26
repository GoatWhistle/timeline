import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/primitives/button'

export function PanelHead({
  title,
  resetLabel,
  onReset,
  end,
}: {
  title: ReactNode
  resetLabel: string
  onReset?: (() => void) | undefined
  end?: ReactNode
}) {
  return (
    <header
      data-panel-head=""
      className="flex h-row shrink-0 items-center gap-1 border-border border-b pr-1.5 pl-3"
    >
      <span className="min-w-0 flex-1">{title}</span>
      {onReset && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={resetLabel}
          title={resetLabel}
          onClick={onReset}
          className="size-8 shrink-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:duration-fast"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </Button>
      )}
      {end}
    </header>
  )
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return <span className="font-medium text-caption text-muted-foreground">{children}</span>
}
