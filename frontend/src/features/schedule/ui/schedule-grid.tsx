import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { packLanes } from '@/features/schedule/model/pack-lanes'
import {
  ROW_LABEL_WIDTH,
  rowHeight,
  type TimelineScale,
} from '@/features/schedule/model/schedule-scale'
import { useScheduleGeometry } from '@/features/schedule/model/use-schedule-geometry'
import type { TimelineResponse, TimelineRow } from '@/shared/api/types.gen'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { DeadlineMark } from './deadline-mark'
import { StageBar } from './stage-bar'

type ScheduleGridProps = {
  data: TimelineResponse
  scale: TimelineScale
  hrefBuilder?: (row: TimelineRow) => string
}

export function ScheduleGrid({ data, scale, hrefBuilder }: ScheduleGridProps) {
  const { t } = useTranslation()
  const { ticks, width, x, position, tickLabel } = useScheduleGeometry(
    data.range.from,
    data.range.to,
    scale,
  )

  const gridTemplateColumns = `${ROW_LABEL_WIDTH}px ${width}px`

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-lg border">
        <div style={{ minWidth: ROW_LABEL_WIDTH + width }}>
          <div className="sticky top-0 z-30 grid border-b bg-card" style={{ gridTemplateColumns }}>
            <div className="sticky left-0 z-40 border-r bg-card px-3 py-2 font-medium text-muted-foreground text-xs uppercase">
              {t('schedule.columnEvent')}
            </div>
            <div className="relative h-9">
              {ticks.map((tick) => (
                <div
                  key={tick.toISOString()}
                  className="absolute top-0 h-full border-l pl-2 text-muted-foreground text-xs leading-9"
                  style={{ left: x(tick) }}
                >
                  {tickLabel(tick)}
                </div>
              ))}
            </div>
          </div>

          {data.rows.map((row) => {
            const href = hrefBuilder?.(row) ?? `/events/${row.event_id}`
            const deadline = row.registration_deadline
            const packed = packLanes(
              row.stages.map((stage) => ({ ...position(stage.start_at, stage.end_at), ...stage })),
            )
            return (
              <div
                key={row.event_id}
                className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns }}
              >
                <div data-timeline-label className="sticky left-0 z-20 border-r bg-card px-3 py-3">
                  <Link to={href} className="font-medium text-sm hover:underline">
                    {row.title}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {t(EVENT_STATE_KEY[row.state])}
                    {row.team_role ? ` · ${row.team_role}` : ''}
                  </p>
                </div>

                <div
                  data-timeline-track
                  className="relative"
                  style={{ height: rowHeight(packed.laneCount) }}
                >
                  <div
                    className="absolute top-2 h-3 rounded-sm bg-muted"
                    style={position(row.start_at, row.end_at)}
                    aria-hidden="true"
                  />

                  {packed.placements.map(({ item, lane }) => (
                    <StageBar
                      key={item.id}
                      stage={item}
                      href={href}
                      left={item.left}
                      width={item.width}
                      lane={lane}
                    />
                  ))}

                  {deadline && <DeadlineMark deadline={deadline} left={x(new Date(deadline))} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
