import { type KeyboardEvent, memo, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import type { ScheduleRow as ScheduleRowData } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { spaceAfterOnLane } from '../../model/bar-label'
import { nearestUpcomingId } from '../../model/nearest-moment'
import { MIN_BAR_WIDTH, packLanes } from '../../model/pack-lanes'
import type { RowItem } from '../../model/row-items'
import { laneTop, rowHeight } from '../../model/schedule-scale'
import { MomentMark } from '../moment-mark/moment-mark'
import { StageBar } from '../stage-bar/stage-bar'
import { StageStepper } from '../stage-stepper/stage-stepper'
import styles from './schedule-row.module.css'

export const ScheduleRow = memo(ScheduleRowView)

export type ScheduleRowProps = {
  row: ScheduleRowData
  items: readonly RowItem[]
  href: string
  sentence: string
  labelWidth: number
  labelAbove: boolean
  canvasWidth: number
  focusedItem: number
  isCursorRow: boolean
  now: Date
  x: (date: Date) => number
  position: (startIso: string, endIso: string) => { left: number; width: number }
  onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => void
  onFocusRow: () => void
  onFocusItem: (index: number) => void
}

function ScheduleRowView(props: ScheduleRowProps) {
  const { t } = useTranslation()
  const { row, items, href, sentence, canvasWidth, focusedItem, isCursorRow, now, x, position } =
    props
  const trackRef = useRef<HTMLTableCellElement>(null)

  const bars = useMemo(
    () =>
      items
        .filter((item) => item.kind === 'bar')
        .map((item) => {
          const placed = position(item.startAt, item.endAt)
          return { left: placed.left, width: Math.max(MIN_BAR_WIDTH, placed.width), item }
        }),
    [items, position],
  )

  const packed = useMemo(() => packLanes(bars.map((bar) => ({ ...bar, id: bar.item.id }))), [bars])
  const lanes = useMemo(
    () => new Map(packed.placements.map((placement) => [placement.item.id, placement.lane])),
    [packed],
  )

  const laid = useMemo(
    () => bars.map((bar) => ({ ...bar, lane: lanes.get(bar.item.id) ?? 0 })),
    [bars, lanes],
  )

  const highlightedId = useMemo(() => nearestUpcomingId(items, now), [items, now])
  const height = rowHeight(packed.laneCount)
  const eventSpan = position(row.start_at, row.end_at)

  useEffect(() => {
    if (!isCursorRow) return
    const target = items[focusedItem]
    if (!target) return
    const element = trackRef.current?.querySelector(
      `[data-schedule-item="${cssEscape(target.id)}"]`,
    )
    if (element instanceof HTMLElement && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [isCursorRow, focusedItem, items])

  return (
    <tr
      tabIndex={isCursorRow ? 0 : -1}
      aria-label={sentence}
      data-schedule-row={row.event_id}
      onKeyDown={props.onKeyDown}
      onFocus={props.onFocusRow}
      className={cn(styles.row, 'grid border-b last:border-b-0')}
      style={{ gridTemplateColumns: `${props.labelWidth}px ${canvasWidth}px` }}
    >
      <td data-schedule-label className="sticky left-0 z-20 border-r bg-card px-3 py-3 align-top">
        <div className="flex flex-col gap-1">
          <Link to={href} tabIndex={-1} className="font-medium text-sm hover:underline">
            {row.title}
          </Link>
          <p className="text-muted-foreground text-caption">
            {t(EVENT_STATE_KEY[row.state])}
            {row.team_role ? ` · ${row.team_role}` : ''}
          </p>
          <StageStepper stages={row.stages} now={now} />
        </div>
      </td>

      <td ref={trackRef} data-schedule-track className="relative" style={{ height }}>
        <div
          className={styles.eventSpan}
          style={{ left: eventSpan.left, width: eventSpan.width, top: 6 }}
          aria-hidden="true"
        />

        {laid.map((bar, index) => (
          <StageBar
            key={bar.item.id}
            item={bar.item}
            left={bar.left}
            width={bar.width}
            top={laneTop(bar.lane)}
            canvasWidth={canvasWidth}
            spaceAfter={spaceAfterOnLane(index, bar.lane, laid, canvasWidth)}
            labelAbove={props.labelAbove}
            focused={isCursorRow && items[focusedItem]?.id === bar.item.id}
            onFocusItem={() => props.onFocusItem(items.findIndex((it) => it.id === bar.item.id))}
          />
        ))}

        {items
          .filter((item) => item.kind === 'moment')
          .map((item) => (
            <MomentMark
              key={item.id}
              item={item}
              left={x(new Date(item.at))}
              top={height / 2}
              highlighted={item.id === highlightedId}
              focused={isCursorRow && items[focusedItem]?.id === item.id}
              now={now}
              onFocusItem={() => props.onFocusItem(items.findIndex((it) => it.id === item.id))}
            />
          ))}
      </td>
    </tr>
  )
}

function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&')
}
