import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { DatePicker } from '@/shared/ui/forms/calendar/date-picker'

type Side = 'from' | 'to'

export function inverted(from: string, to: string): boolean {
  return from !== '' && to !== '' && from > to
}

export function FilterDateRange({
  id,
  from,
  to,
  autoFocus = false,
  stacked = false,
  onChange,
}: {
  id: string
  from: string
  to: string
  autoFocus?: boolean
  stacked?: boolean
  onChange: (range: { from: string; to: string }) => void
}) {
  const { t } = useTranslation()
  const [held, setHeld] = useState<{ side: Side; date: string } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!autoFocus) return
    box.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
  }, [autoFocus])

  function take(side: Side, date: string) {
    const next = { from, to, [side]: date }
    if (held && held.side !== side) {
      const withHeld = { ...next, [held.side]: held.date }
      if (!inverted(withHeld.from, withHeld.to)) {
        setHeld(null)
        onChange(withHeld)
        return
      }
    }
    if (inverted(next.from, next.to)) {
      setHeld({ side, date })
      return
    }
    if (held?.side === side) setHeld(null)
    onChange(next)
  }

  const noteId = `${id}-note`

  return (
    <div ref={box} className="flex flex-col gap-1.5">
      <div
        className={cn(
          'grid items-center gap-1.5',
          stacked
            ? 'grid-cols-[2rem_minmax(0,1fr)]'
            : 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
        )}
      >
        {stacked && (
          <label htmlFor={`${id}-from`} className="text-meta text-muted-foreground">
            {t('filters.from')}
          </label>
        )}
        <DatePicker
          id={`${id}-from`}
          value={from}
          bounds={{ max: to || undefined }}
          range={from && to ? { from, to } : null}
          invalid={held?.side === 'from'}
          describedBy={held?.side === 'from' ? noteId : undefined}
          onChange={(date) => take('from', date)}
        />
        {stacked ? (
          <label htmlFor={`${id}-to`} className="text-meta text-muted-foreground">
            {t('filters.to')}
          </label>
        ) : (
          <span aria-hidden="true" className="text-meta text-muted-foreground">
            –
          </span>
        )}
        <DatePicker
          id={`${id}-to`}
          value={to}
          bounds={{ min: from || undefined }}
          range={from && to ? { from, to } : null}
          invalid={held?.side === 'to'}
          describedBy={held?.side === 'to' ? noteId : undefined}
          onChange={(date) => take('to', date)}
        />
      </div>
      {held && (
        <p
          id={noteId}
          role="alert"
          data-filter-note=""
          className="text-caption text-destructive motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-fast"
        >
          {t('filters.rangeInverted')}
        </p>
      )}
    </div>
  )
}
