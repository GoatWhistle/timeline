import { useTranslation } from 'react-i18next'
import type { TeamEventEntryResponse, TeamMemberResponse } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Badge } from '@/shared/ui/primitives/badge'
import { RosterTable } from './roster-table'

export function TeamEventCard({
  teamId,
  entry,
  members,
  isLead,
}: {
  teamId: string
  entry: TeamEventEntryResponse
  members: TeamMemberResponse[]
  isLead: boolean
}) {
  const { t } = useTranslation('team')

  const limits = () => {
    const { team_size_min: min, team_size_max: max } = entry
    if (min !== undefined && max !== undefined) return t('rosterLimits', { min, max })
    if (min !== undefined) return t('rosterMin', { min })
    if (max !== undefined) return t('rosterMax', { max })
    return t('rosterNoLimits')
  }

  return (
    <Card>
      <CardHeader className="gap-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{entry.event_title}</CardTitle>
            <p className="mt-1 text-meta text-muted-foreground">{limits()}</p>
          </div>
          <Badge tone={entry.registered ? 'primary' : 'neutral'} className="shrink-0">
            {t(entry.registered ? 'teamRegistered' : 'teamNotRegistered')}
          </Badge>
        </div>
        <p className="text-meta text-muted-foreground">
          {t('registeredCount', { done: entry.registered_count, total: entry.roster_size })}
          <span className={cn('ml-2 opacity-80')}>{t('derivedHint')}</span>
        </p>
      </CardHeader>
      <CardContent>
        <RosterTable teamId={teamId} entry={entry} members={members} isLead={isLead} />
      </CardContent>
    </Card>
  )
}
