import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { toLocale } from '@/shared/i18n/locale'
import { Button } from '@/shared/ui/primitives/button'
import { CalendarGrid, type RangeHighlight } from './calendar-grid'
import { monthTitle } from './calendar-labels'
import type { DayBounds } from './month-grid'
import { useCalendar } from './use-calendar'

export function CalendarPanel({
  value,
  bounds,
  range,
  open,
  onPick,
  onClose,
}: {
  value: string
  bounds: DayBounds
  range: RangeHighlight
  open: boolean
  onPick: (date: string) => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation('event')
  const locale = toLocale(i18n.language)
  const titleId = useId()
  const { today, focused, month, moveTo, stepMonth, handleKeyDown } = useCalendar({
    value,
    bounds,
    open,
    onPick,
    onClose,
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('calendar.previousMonth')}
          onClick={() => stepMonth(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <span id={titleId} aria-live="polite" className="font-medium text-copy capitalize">
          {monthTitle(month, locale)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('calendar.nextMonth')}
          onClick={() => stepMonth(1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <CalendarGrid
        month={month}
        focused={focused}
        selected={value}
        today={today}
        range={range}
        bounds={bounds}
        locale={locale}
        labelledBy={titleId}
        autoFocus={open}
        onSelect={(date) => {
          moveTo(date)
          onPick(date)
        }}
        onKeyDown={handleKeyDown}
      />

      <p className="text-caption text-muted-foreground">{t('calendar.keyboardHint')}</p>
    </div>
  )
}
