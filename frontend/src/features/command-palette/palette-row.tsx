import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import type { PaletteResult } from './palette-results'

export function PaletteRow({
  result,
  active,
  onHover,
  onChoose,
}: {
  result: PaletteResult
  active: boolean
  onHover: () => void
  onChoose: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      id={`command-${result.id}`}
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onChoose}
      className={cn(
        'flex h-row-roomy w-full items-center gap-3 rounded-control px-3 text-left',
        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
        active ? 'bg-accent-surface' : 'hover:bg-surface-2',
      )}
    >
      {result.hint && (
        <span className="shrink-0 rounded-badge bg-surface-2 px-1.5 py-0.5 font-mono text-caption text-muted-foreground">
          {result.hint}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-copy">{result.title}</span>
      {active && (
        <kbd className="shrink-0 rounded-badge border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-caption text-muted-foreground">
          ↵
        </kbd>
      )}
      <ArrowRight
        className={cn(
          'size-4 shrink-0 text-muted-foreground',
          active ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{t('palette.goto', { title: result.title })}</span>
    </button>
  )
}
