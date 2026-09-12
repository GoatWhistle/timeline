import { CalendarDays } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import type { RangeHighlight } from './calendar-grid'
import { CalendarPanel } from './calendar-panel'
import { DATE_TEXT_PATTERN, formatDateText, groomDateText, parseDateText } from './date-text'
import type { DayBounds } from './month-grid'

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
  const panelRef = useRef<HTMLDivElement>(null)
  const unreadable = useRef(false)

  useEffect(() => {
    if (unreadable.current) return
    setText((current) => (parseDateText(current) === value ? current : formatDateText(value)))
  }, [value])

  function report(problem: boolean) {
    unreadable.current = problem
    onUnreadable?.(problem)
  }

  function close() {
    setOpen(false)
  }

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
    <div className="flex items-center gap-2">
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
          const next = groomDateText(event.target.value, text)
          setText(next)
          const parsed = parseDateText(next)
          if (parsed !== null) {
            report(false)
            if (parsed !== value) onChange(parsed)
          }
        }}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData('text')
          const parsed = parseDateText(pasted)
          if (parsed === null) return
          event.preventDefault()
          setText(formatDateText(parsed))
          report(false)
          if (parsed !== value) onChange(parsed)
        }}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          commit(event.currentTarget.value)
        }}
        className={cn(
          'h-9 w-full min-w-0 flex-1 rounded-control border border-input bg-transparent px-3 text-copy tabular-nums shadow-flat',
          'transition-colors motion-safe:duration-instant',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'aria-invalid:border-destructive aria-invalid:outline-destructive',
        )}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? `${id}-calendar` : undefined}
            aria-label={t('calendar.openCalendar')}
            aria-invalid={invalid ? true : undefined}
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-control border border-input bg-transparent text-muted-foreground shadow-flat',
              TOUCH_REACH,
              'transition-colors motion-safe:duration-instant hover:bg-accent-surface hover:text-foreground',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              'aria-invalid:border-destructive aria-invalid:outline-destructive',
            )}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          ref={panelRef}
          id={`${id}-calendar`}
          align="start"
          aria-label={t('calendar.dialogLabel')}
          className="w-max max-w-[calc(100vw-1.5rem)] overflow-x-auto p-3"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            panelRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus({
              preventScroll: true,
            })
          }}
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
              close()
            }}
            onClose={close}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
