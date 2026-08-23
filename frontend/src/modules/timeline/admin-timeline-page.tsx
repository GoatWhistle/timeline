import { useQuery } from '@tanstack/react-query'
import { usersQuery } from '@/shared/api/directory'
import type { HackathonState } from '@/shared/api/types.gen'
import { HACKATHON_STATE_LABEL, HACKATHON_STATES } from '@/shared/lib/enums'
import { useUrlFilters } from '@/shared/lib/use-url-filters'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states'
import { adminTimelineQuery } from './api'
import { ScaleSwitch } from './scale-switch'
import { Timeline, TimelineLegend, type TimelineScale } from './timeline'

const ALL = 'ALL'
const DEFAULTS = { scale: 'month', state: ALL, participant: ALL, archived: '' }

export function AdminTimelinePage() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const scale: TimelineScale = filters.scale === 'week' ? 'week' : 'month'

  const users = useQuery(usersQuery({ page_size: 100 }))
  const query = useQuery(
    adminTimelineQuery({
      ...(filters.state !== ALL ? { state: filters.state as HackathonState } : {}),
      ...(filters.participant !== ALL ? { participant_user_id: filters.participant } : {}),
      ...(filters.archived === '1' ? { include_archived: true } : {}),
    }),
  )

  return (
    <div>
      <PageHeader
        title="Временная шкала"
        description="Все опубликованные хакатоны"
        actions={<ScaleSwitch value={scale} onChange={(next) => setFilters({ scale: next })} />}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-52">
          <Select value={filters.state} onValueChange={(value) => setFilters({ state: value })}>
            <SelectTrigger aria-label="Состояние">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все состояния</SelectItem>
              {HACKATHON_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {HACKATHON_STATE_LABEL[state]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-64">
          <Select
            value={filters.participant}
            onValueChange={(value) => setFilters({ participant: value })}
          >
            <SelectTrigger aria-label="Участник">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все участники</SelectItem>
              {(users.data?.items ?? []).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant={filters.archived === '1' ? 'default' : 'outline'}
          onClick={() => setFilters({ archived: filters.archived === '1' ? undefined : '1' })}
        >
          Показывать архивные
        </Button>
      </div>

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.rows.length === 0 && (
        <EmptyState title="Хакатоны не найдены" description="Измените фильтры" />
      )}

      {query.data && query.data.rows.length > 0 && (
        <div className="flex flex-col gap-4">
          <Timeline
            data={query.data}
            scale={scale}
            hrefBuilder={(row) => `/admin/hackathons/${row.hackathon_id}`}
          />
          <TimelineLegend />
        </div>
      )}
    </div>
  )
}
