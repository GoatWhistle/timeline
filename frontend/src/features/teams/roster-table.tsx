import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRosterMember } from '@/entities/team/team.queries'
import type { TeamEventEntryResponse, TeamMemberResponse } from '@/shared/api/types.gen'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { statusLabelKey, statusTone } from './member-state'

export function RosterTable({
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
  const mutate = useRosterMember(teamId)

  const onRoster = new Set(entry.roster.map((row) => row.user.id))
  const candidates = members.filter(
    (member) => member.state === 'ACTIVE' && !onRoster.has(member.user.id),
  )
  const full = entry.team_size_max !== undefined && entry.roster_size >= entry.team_size_max

  async function act(userId: string, action: 'add' | 'remove' | 'mark') {
    try {
      await mutate.mutateAsync({ eventId: entry.event_id, userId, action })
      toast.success(
        t(action === 'add' ? 'rosterAdded' : action === 'remove' ? 'rosterRemoved' : 'marked'),
      )
    } catch {
      toast.error(t(action === 'mark' ? 'markFailed' : 'rosterFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-medium text-copy">{t('roster')}</h3>
        <p className="text-meta text-muted-foreground">{t('rosterHint')}</p>
      </div>

      {entry.roster.length === 0 ? (
        <p className="rounded-lg border border-border border-dashed px-4 py-6 text-center text-meta text-muted-foreground">
          {t('rosterEmpty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columnUser')}</TableHead>
              <TableHead className="w-40">{t('columnState')}</TableHead>
              {isLead && <TableHead className="w-56">{t('columnActions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entry.roster.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="font-medium">{row.user.display_name}</span>
                  {row.is_lead && (
                    <Badge tone="outline" className="ml-2">
                      {t('lead')}
                    </Badge>
                  )}
                  {!row.assigned && (
                    <p className="mt-1 text-caption text-muted-foreground">
                      {t('notAssignedHint')}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {row.assigned ? (
                    <Badge tone={statusTone(row.registration_status)}>
                      {t(statusLabelKey(row.registration_status))}
                    </Badge>
                  ) : (
                    <Badge tone="danger">{t('notAssigned')}</Badge>
                  )}
                </TableCell>
                {isLead && (
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.assigned && row.registration_status === 'TODO' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title={t('markHint')}
                          disabled={mutate.isPending}
                          onClick={() => act(row.user.id, 'mark')}
                        >
                          {t('markRegistered')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={mutate.isPending}
                        onClick={() => act(row.user.id, 'remove')}
                      >
                        {t('removeFromRoster')}
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {isLead && candidates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-meta text-muted-foreground">{t('addToRoster')}:</span>
          {candidates.map((member) => (
            <Button
              key={member.id}
              variant="outline"
              size="sm"
              disabled={full || mutate.isPending}
              onClick={() => act(member.user.id, 'add')}
            >
              {member.user.display_name}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
