import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScheduleResponse, ScheduleRow as ScheduleRowData } from '@/shared/api/types.gen'
import { formatDate, formatRelative } from '@/shared/datetime/datetime'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { buildRowItems } from '../../model/row-items'
import { type Cursor, clampCursor, resolveKey } from '../../model/row-navigation'
import { itemSentence, rowSentence } from '../../model/row-sentence'
import {
  LABEL_ABOVE_BREAKPOINT,
  NARROW_LABEL_WIDTH,
  ROW_LABEL_WIDTH,
  type ScheduleScale,
} from '../../model/schedule-scale'
import { useAnnouncer } from '../../model/use-announcer'
import { useScheduleGeometry } from '../../model/use-schedule-geometry'
import { useTodayLine } from '../../model/use-today-line'
import type { Range } from '../../model/zoom-range'
import { ScheduleHeader } from '../schedule-header/schedule-header'
import { ScheduleRow } from '../schedule-row/schedule-row'
import styles from './schedule-grid.module.css'

export type ScheduleGridProps = {
  data: ScheduleResponse
  range: Range
  scale: ScheduleScale
  now?: Date
  viewportWidth?: number
  hrefBuilder?: (row: ScheduleRowData) => string
  onNavigate?: (href: string) => void
  onToday?: () => void
  onZoom?: (direction: 1 | -1) => void
}

export function ScheduleGrid({
  data,
  range,
  scale,
  now = new Date(),
  viewportWidth = 0,
  hrefBuilder,
  onNavigate,
  onToday,
  onZoom,
}: ScheduleGridProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [cursor, setCursor] = useState<Cursor>({ row: 0, item: 0 })
  const { message, announce } = useAnnouncer()

  const { ticks, width, x, position, tickLabel } = useScheduleGeometry(range, scale)
  useTodayLine({ target: canvasRef, scale, x, width })

  const labelAbove = viewportWidth > 0 && viewportWidth < LABEL_ABOVE_BREAKPOINT
  const labelWidth = labelAbove ? NARROW_LABEL_WIDTH : ROW_LABEL_WIDTH

  const grid = useMemo(() => data.rows.map((row) => buildRowItems(row)), [data.rows])

  const sentenceContext = useMemo(
    () => ({
      t,
      formatDate: (iso: string) => formatDate(iso),
      formatRemaining: (iso: string) => formatRelative(iso, now),
      now,
    }),
    [t, now],
  )

  const onKeyDown = useCallback(
    (rowIndex: number) => (event: KeyboardEvent<HTMLTableRowElement>) => {
      const action = resolveKey(event.key, grid, { row: rowIndex, item: cursor.item })
      if (!action) return
      event.preventDefault()

      if (action.type === 'today') {
        onToday?.()
        return
      }
      if (action.type === 'zoomIn' || action.type === 'zoomOut') {
        onZoom?.(action.type === 'zoomIn' ? 1 : -1)
        return
      }
      if (action.type === 'open') {
        const row = data.rows[rowIndex]
        if (row) onNavigate?.(hrefBuilder?.(row) ?? `/events/${row.event_id}`)
        return
      }

      const next = clampCursor(grid, { row: action.row, item: action.item })
      setCursor(next)
      const item = grid[next.row]?.[next.item]
      announce(item ? itemSentence(item, sentenceContext) : '')

      if (next.row !== rowIndex) {
        const target = canvasRef.current?.querySelectorAll('[data-schedule-row]')[next.row]
        if (target instanceof HTMLElement) target.focus()
      }
    },
    [
      grid,
      cursor.item,
      data.rows,
      hrefBuilder,
      onNavigate,
      onToday,
      onZoom,
      announce,
      sentenceContext,
    ],
  )

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-lg border">
        <div ref={canvasRef} className={styles.canvas} style={{ minWidth: labelWidth + width }}>
          <span className={styles.todayLine} style={{ left: labelWidth }} aria-hidden="true">
            <span className={styles.todayDot} />
          </span>

          <table aria-label={t('schedule.tableAria')} className="block w-full border-collapse">
            <ScheduleHeader
              ticks={ticks}
              x={x}
              tickLabel={tickLabel}
              labelWidth={labelWidth}
              canvasWidth={width}
            />
            <tbody className="block">
              {data.rows.map((row, rowIndex) => (
                <ScheduleRow
                  key={row.event_id}
                  row={row}
                  items={grid[rowIndex] ?? []}
                  href={hrefBuilder?.(row) ?? `/events/${row.event_id}`}
                  sentence={rowSentence(row, grid[rowIndex] ?? [], sentenceContext)}
                  labelWidth={labelWidth}
                  labelAbove={labelAbove}
                  canvasWidth={width}
                  focusedItem={cursor.item}
                  isCursorRow={cursor.row === rowIndex}
                  now={now}
                  x={x}
                  position={position}
                  onKeyDown={onKeyDown(rowIndex)}
                  onFocusRow={() => setCursor((previous) => ({ ...previous, row: rowIndex }))}
                  onFocusItem={(item) => setCursor({ row: rowIndex, item })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <output aria-live="polite" className="sr-only">
        {message}
      </output>
    </TooltipProvider>
  )
}
