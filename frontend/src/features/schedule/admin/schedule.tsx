import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY, EVENT_STATES } from '@/entities/event/event.labels'
import { adminScheduleQuery } from '@/entities/schedule/schedule.queries'
import type { ScheduleScale } from '@/features/schedule/model/schedule-scale'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid'
import { ScheduleLegend } from '@/features/schedule/ui/schedule-legend'
import { ZoomSwitch } from '@/features/schedule/zoom-switch/zoom-switch'
import { usersQuery } from '@/shared/api/directory'
import type { EventState } from '@/shared/api/types.gen'
import { localeCollator } from '@/shared/datetime/datetime'
import { useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { toLocale } from '@/shared/i18n/locale'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Button } from '@/shared/ui/primitives/button'

const ALL = 'ALL'
const DEFAULTS = { scale: 'month', state: ALL, participant: ALL, archived: '' }

export function AdminSchedulePage() {
  const { t, i18n } = useTranslation()
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const scale: ScheduleScale = filters.scale === 'week' ? 'week' : 'month'

  const users = useQuery(usersQuery({ page_size: 100 }))

  const language = i18n.language
  const sortedUsers = useMemo(() => {
    const collator = localeCollator(toLocale(language))
    return [...(users.data?.items ?? [])].sort((a, b) =>
      collator.compare(a.display_name, b.display_name),
    )
  }, [users.data, language])

  const query = useQuery(
    adminScheduleQuery({
      ...(filters.state !== ALL ? { state: filters.state as EventState } : {}),
      ...(filters.participant !== ALL ? { participant_user_id: filters.participant } : {}),
      ...(filters.archived === '1' ? { include_archived: true } : {}),
    }),
  )

  return (
    <div>
      <PageHeader
        title={t('schedule.title')}
        description={t('schedule.adminDescription')}
        actions={<ZoomSwitch value={scale} onChange={(next) => setFilters({ scale: next })} />}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-52">
          <Select value={filters.state} onValueChange={(value) => setFilters({ state: value })}>
            <SelectTrigger aria-label={t('schedule.stateAria')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('schedule.allStates')}</SelectItem>
              {EVENT_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {t(EVENT_STATE_KEY[state])}
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
            <SelectTrigger aria-label={t('schedule.participantAria')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('schedule.allParticipants')}</SelectItem>
              {sortedUsers.map((item) => (
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
          {t('schedule.showArchived')}
        </Button>
      </div>

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.rows.length === 0 && (
        <EmptyState title={t('schedule.emptyTitle')} description={t('schedule.emptyHint')} />
      )}

      {query.data && query.data.rows.length > 0 && (
        <div className="flex flex-col gap-4">
          <ScheduleGrid
            data={query.data}
            scale={scale}
            hrefBuilder={(row) => `/admin/events/${row.event_id}`}
          />
          <ScheduleLegend />
        </div>
      )}
    </div>
  )
}
