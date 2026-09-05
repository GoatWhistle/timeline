import { CalendarDays } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { FLOATING_SURFACE } from '@/shared/ui/overlays/overlay-chrome'
import type { RangeHighlight } from './calendar-grid'
import { CalendarPanel } from './calendar-panel'
import { acceptDateText, DATE_TEXT_PATTERN, formatDateText, parseDateText } from './date-text'
import type { DayBounds } from './month-grid'
import { panelHost, useAnchoredPanel } from './use-anchored-panel'

export function DatePicker({
  id,
  value,
  bounds = {},
  range = null,
  invalid,
  describedBy,
  required,
  onChange,
  onUnreadable,
}: {
  id: string
  value: string
  bounds?: DayBounds
  range?: RangeHighlight
  invalid?: boolean
  describedBy?: string | undefined
  required?: boolean
  onChange: (date: string) => void
  onUnreadable?: (unreadable: boolean) => void
}) {
  const { t } = useTranslation('event')
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => formatDateText(value))
  const anchorRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef(false)
  const unreadable = useRef(false)
  const placement = useAnchoredPanel(open, anchorRef, panelRef)

  useEffect(() => {
    if (unreadable.current) return
    setText((current) => (parseDateText(current) === value ? current : formatDateText(value)))
  }, [value])

  function report(problem: boolean) {
    unreadable.current = problem
    onUnreadable?.(problem)
  }

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
    function outside(target: Node): boolean {
      const panel = panelRef.current
      if (panel === null) return false
      return !panel.contains(target) && !triggerRef.current?.contains(target)
    }
    function onPointerDown(event: PointerEvent) {
      if (outside(event.target as Node)) setOpen(false)
    }
    function onFocusIn(event: FocusEvent) {
      if (outside(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
    }
  }, [open])

  function commit(raw: string) {
    const parsed = parseDateText(raw)
    if (parsed !== null) {
      setText(formatDateText(parsed))
      report(false)
      if (parsed !== value) onChange(parsed)
      return
    }
    if (raw.trim() === '') {
      setText('')
      report(false)
      if (value !== '') onChange('')
      return
    }
    report(true)
    if (value !== '') onChange('')
  }

  return (
    <div ref={anchorRef} className="flex items-center gap-2">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={DATE_TEXT_PATTERN}
        maxLength={10}
        value={text}
        data-value={value || undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required ? true : undefined}
        onChange={(event) => {
          const next = acceptDateText(event.target.value)
          setText(next)
          const parsed = parseDateText(next)
          if (parsed !== null) {
            report(false)
            if (parsed !== value) onChange(parsed)
          }
        }}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          commit(event.currentTarget.value)
        }}
        className={cn(
          'h-9 w-full min-w-0 flex-1 rounded-control border border-input bg-transparent px-3 text-copy tabular-nums shadow-xs',
          'transition-colors motion-safe:duration-instant',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'aria-invalid:border-destructive aria-invalid:outline-destructive',
        )}
      />

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-calendar` : undefined}
        aria-label={t('calendar.openCalendar')}
        aria-invalid={invalid ? true : undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-control border border-input bg-transparent text-muted-foreground shadow-xs',
          TOUCH_REACH,
          'transition-colors motion-safe:duration-instant hover:bg-accent-surface hover:text-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'aria-invalid:border-destructive aria-invalid:outline-destructive',
        )}
      >
        <CalendarDays className="size-4" aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={`${id}-calendar`}
            role="dialog"
            aria-modal="false"
            aria-label={t('calendar.dialogLabel')}
            data-escape-owner="true"
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              event.stopPropagation()
              close(true)
            }}
            style={{
              top: placement?.top ?? 0,
              left: placement?.left ?? 0,
              opacity: placement === null ? 0 : undefined,
            }}
            className={cn(
              FLOATING_SURFACE,
              'pointer-events-auto fixed w-max max-w-[calc(100vw-1.5rem)] overflow-x-auto p-3',
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
                setText(formatDateText(date))
                report(false)
                close(true)
              }}
              onClose={() => close(true)}
            />
          </div>,
          panelHost(anchorRef.current),
        )}
    </div>
  )
}
