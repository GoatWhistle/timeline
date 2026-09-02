import { CalendarDays } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isCivilDate } from '@/shared/datetime/civil'
import { toLocale } from '@/shared/i18n/locale'
import { cn } from '@/shared/styling/class-names/class-names'
import { FLOATING_SURFACE } from '@/shared/ui/overlays/overlay-chrome'
import type { RangeHighlight } from './calendar-grid'
import { shortDayLabel } from './calendar-labels'
import { CalendarPanel } from './calendar-panel'
import type { DayBounds } from './month-grid'

export function DatePicker({
  id,
  value,
  bounds = {},
  range = null,
  invalid,
  describedBy,
  onChange,
}: {
  id: string
  value: string
  bounds?: DayBounds
  range?: RangeHighlight
  invalid?: boolean
  describedBy?: string | undefined
  onChange: (date: string) => void
}) {
  const { t, i18n } = useTranslation('event')
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef(false)

  function close(returnFocus: boolean) {
    restoreFocus.current = returnFocus
    setOpen(false)
  }

  useLayoutEffect(() => {
    if (open || !restoreFocus.current) return
    restoreFocus.current = false
    triggerRef.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    function onFocusIn(event: FocusEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
    }
  }, [open])

  const text = isCivilDate(value)
    ? shortDayLabel(value, toLocale(i18n.language))
    : t('calendar.pickDate')

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        data-value={value || undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-control border border-input bg-transparent px-3 text-copy shadow-xs',
          'transition-colors motion-safe:duration-instant hover:bg-accent-surface',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'aria-invalid:border-destructive aria-invalid:outline-destructive',
          !isCivilDate(value) && 'text-muted-foreground',
        )}
      >
        <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{text}</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={t('calendar.dialogLabel')}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            close(true)
          }}
          className={cn(
            FLOATING_SURFACE,
            'absolute top-full left-0 mt-2 w-max p-3',
            'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95',
            'motion-safe:duration-fast motion-safe:ease-out',
          )}
        >
          <CalendarPanel
            value={value}
            bounds={bounds}
            range={range}
            open={open}
            onPick={(date) => {
              onChange(date)
              close(true)
            }}
            onClose={() => close(true)}
          />
        </div>
      )}
    </div>
  )
}
