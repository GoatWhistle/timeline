import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarRange, UsersRound } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { teamEventsQuery } from '@/entities/team/team.queries'
import { cn } from '@/shared/styling/class-names/class-names'
import { Card } from '@/shared/ui/layout/card'
import { useTeamContext } from './team-context'

const TILE = cn(
  'flex items-center justify-between gap-4 rounded-surface p-4',
  'transition-colors duration-instant ease-out',
  'hover:bg-surface-2',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
)

function Tile({
  to,
  icon: Icon,
  label,
  value,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <NavLink to={to} className="block rounded-surface">
      <Card className={TILE}>
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate font-medium text-copy">{label}</p>
            <p className="truncate text-meta text-muted-foreground">{value}</p>
          </div>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Card>
    </NavLink>
  )
}

export function TeamOverview() {
  const { t } = useTranslation('team')
  const { teamId, detail, isLead } = useTeamContext()
  const events = useQuery(teamEventsQuery(teamId))

  const active = detail.members.filter((member) => member.state !== 'LEFT')
  const entries = events.data?.items ?? []
  const invited = detail.team?.my_state === 'INVITED'

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {!isLead && (
        <p
          className={cn(
            'rounded-surface border border-border border-dashed bg-surface-2 px-4 py-3',
            'text-meta text-muted-foreground',
          )}
        >
          {t(invited ? 'invitedNotice' : 'readOnlyNotice')}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Tile
          to={`/teams/${teamId}/members`}
          icon={UsersRound}
          label={t('members')}
          value={t('memberCount', { count: active.length })}
        />
        <Tile
          to={`/teams/${teamId}/events`}
          icon={CalendarRange}
          label={t('events')}
          value={t('entryCount', { count: entries.length })}
        />
      </div>

      <p className="text-meta text-muted-foreground">{t('selfReportHint')}</p>
    </div>
  )
}
