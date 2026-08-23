import { scaleTime } from 'd3-scale'
import { eachMonthOfInterval, eachWeekOfInterval, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMemo } from 'react'
import { Link } from 'react-router'
import type { TimelineResponse, TimelineRow } from '@/shared/api/types.gen'
import { cn } from '@/shared/lib/cn'
import { formatDate, formatDateTime } from '@/shared/lib/datetime'
import { HACKATHON_STATE_LABEL, STAGE_TYPE_COLOR, STAGE_TYPE_LABEL } from '@/shared/lib/enums'

export type TimelineScale = 'month' | 'week'

const ROW_LABEL_WIDTH = 260
/** Минимальная ширина одного деления: определяет общую ширину полотна. */
const TICK_WIDTH: Record<TimelineScale, number> = { month: 120, week: 64 }

type TimelineProps = {
  data: TimelineResponse
  scale: TimelineScale
  hrefBuilder?: (row: TimelineRow) => string
}

/**
 * Диаграмма Ганта на CSS Grid. d3-scale используется только для перевода
 * времени в пиксели (раздел 14.2 ТЗ); готовые Gantt-библиотеки запрещены.
 * Пересекающиеся этапы не схлопываются: каждый хакатон — отдельная строка.
 */
export function Timeline({ data, scale, hrefBuilder }: TimelineProps) {
  const from = new Date(data.range.from)
  const to = new Date(data.range.to)

  const ticks = useMemo(() => {
    if (to <= from) return [from]
    return scale === 'month'
      ? eachMonthOfInterval({ start: from, end: to })
      : eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 })
  }, [from, to, scale])

  const canvasWidth = Math.max(640, ticks.length * TICK_WIDTH[scale])
  const x = useMemo(
    () => scaleTime().domain([from, to]).range([0, canvasWidth]),
    [from, to, canvasWidth],
  )

  const position = (startIso: string, endIso: string) => {
    const start = x(new Date(startIso))
    const end = x(new Date(endIso))
    const left = Math.max(0, Math.min(start, canvasWidth))
    const right = Math.max(0, Math.min(end, canvasWidth))
    return { left, width: Math.max(4, right - left) }
  }

  const tickLabel = (date: Date) =>
    scale === 'month'
      ? format(date, 'LLLL yyyy', { locale: ru })
      : format(date, 'd MMM', { locale: ru })

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div style={{ minWidth: ROW_LABEL_WIDTH + canvasWidth }}>
        <div
          className="sticky top-0 z-10 grid border-b bg-card"
          style={{ gridTemplateColumns: `${ROW_LABEL_WIDTH}px ${canvasWidth}px` }}
        >
          <div className="border-r px-3 py-2 font-medium text-muted-foreground text-xs uppercase">
            Хакатон
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
          const href = hrefBuilder?.(row) ?? `/hackathons/${row.hackathon_id}`
          const deadline = row.registration_deadline
          return (
            <div
              key={row.hackathon_id}
              className="grid border-b last:border-b-0"
              style={{ gridTemplateColumns: `${ROW_LABEL_WIDTH}px ${canvasWidth}px` }}
            >
              <div className="border-r px-3 py-3">
                <Link to={href} className="font-medium text-sm hover:underline">
                  {row.title}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {HACKATHON_STATE_LABEL[row.state]}
                  {row.team_role ? ` · ${row.team_role}` : ''}
                </p>
              </div>

              <div className="relative h-16">
                {/* Общий период хакатона — фон строки. */}
                <div
                  className="absolute top-2 h-3 rounded-sm bg-muted"
                  style={position(row.start_at, row.end_at)}
                  aria-hidden="true"
                />

                {row.stages.map((stage, index) => {
                  const { left, width } = position(stage.start_at, stage.end_at)
                  // Пересечения раскладываются по двум дорожкам, а не схлопываются.
                  const track = index % 2
                  return (
                    <Link
                      key={stage.id}
                      to={href}
                      title={`${stage.name} · ${STAGE_TYPE_LABEL[stage.type]} · ${formatDate(stage.start_at)} — ${formatDate(stage.end_at)}`}
                      className={cn(
                        'absolute flex h-5 items-center overflow-hidden rounded-sm px-1.5 text-[11px] text-stage-foreground',
                        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                        STAGE_TYPE_COLOR[stage.type],
                      )}
                      style={{ left, width, top: 24 + track * 20 }}
                    >
                      <span className="truncate">{stage.name}</span>
                    </Link>
                  )
                })}

                {deadline && (
                  // Дедлайн регистрации — отдельный маркер, а не интервал.
                  <div
                    className="absolute top-1 bottom-1 w-0.5 bg-destructive"
                    style={{ left: x(new Date(deadline)) }}
                    title={`Дедлайн регистрации: ${formatDateTime(deadline)}`}
                  >
                    <span className="sr-only">Дедлайн регистрации {formatDateTime(deadline)}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Легенда типов этапов: цвет сам по себе не является единственным признаком. */
export function TimelineLegend() {
  return (
    <ul className="flex flex-wrap gap-3 text-muted-foreground text-xs">
      {(Object.keys(STAGE_TYPE_LABEL) as (keyof typeof STAGE_TYPE_LABEL)[]).map((type) => (
        <li key={type} className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-sm', STAGE_TYPE_COLOR[type])} aria-hidden="true" />
          {STAGE_TYPE_LABEL[type]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-0.5 bg-destructive" aria-hidden="true" />
        Дедлайн регистрации
      </li>
    </ul>
  )
}
