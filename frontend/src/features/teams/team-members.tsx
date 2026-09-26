import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRemoveTeamMember } from '@/entities/team/team.queries'
import type { TeamMemberResponse } from '@/shared/api/types.gen'
import {
  ResizableHead,
  ResizableTable,
  type TableColumn,
} from '@/shared/ui/data-display/column-resize/resizable-table'
import { TableBody, TableCell, TableHeader, TableRow } from '@/shared/ui/data-display/table'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { InviteMemberDialog } from './invite-member-dialog'
import { memberStateTone } from './member-state'
import { useTeamContext } from './team-context'

const MEMBER_COLUMNS: TableColumn[] = [
  { id: 'user', width: 280 },
  { id: 'state', width: 160 },
]

const MEMBER_ACTIONS: TableColumn = { id: 'actions', width: 150 }

export function TeamMembers() {
  const { t } = useTranslation('team')
  const { teamId, detail, isLead } = useTeamContext()
  const members = detail.members
  const [inviting, setInviting] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<TeamMemberResponse | null>(null)
  const remove = useRemoveTeamMember(teamId)

  async function submitRemove() {
    if (!pendingRemoval) return
    try {
      await remove.mutateAsync({ userId: pendingRemoval.user.id })
      toast.success(t('removed'))
      setPendingRemoval(null)
    } catch {
      toast.error(t('removeFailed'))
    }
  }

  const active = members.filter((member) => member.state !== 'LEFT')

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-heading">{t('members')}</h2>
          <p className="text-meta text-muted-foreground">
            {t('memberCount', { count: active.length })}
          </p>
        </div>
        {isLead && (
          <Button variant="outline" onClick={() => setInviting(true)}>
            <UserPlus aria-hidden="true" />
            {t('invite')}
          </Button>
        )}
      </div>

      <ResizableTable
        storageKey="timeline-team-members-widths"
        columns={isLead ? [...MEMBER_COLUMNS, MEMBER_ACTIONS] : MEMBER_COLUMNS}
        flexible="user"
      >
        <TableHeader>
          <TableRow>
            <ResizableHead column="user" label={t('columnUser')} />
            <ResizableHead column="state" label={t('columnState')} />
            {isLead && <ResizableHead column="actions" label={t('columnActions')} />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {active.map((member) => (
            <TableRow key={member.id}>
              <TableCell data-lead="" className="truncate">
                <span className="font-medium">{member.user.display_name}</span>
                <span className="ml-2 text-muted-foreground">{member.user.email}</span>
                {member.is_lead && (
                  <Badge tone="outline" className="ml-2">
                    {t('lead')}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge tone={memberStateTone(member.state)}>
                  {t(member.state === 'ACTIVE' ? 'stateActive' : 'stateInvited')}
                </Badge>
              </TableCell>
              {isLead && (
                <TableCell>
                  {!member.is_lead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingRemoval(member)}
                      disabled={remove.isPending}
                    >
                      {t('removeMember')}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </ResizableTable>

      <InviteMemberDialog teamId={teamId} open={inviting} onOpenChange={setInviting} />

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null)
        }}
        title={t('removeConfirmTitle')}
        description={t('removeConfirmBody')}
        confirmLabel={t('removeMember')}
        destructive
        disabled={remove.isPending}
        onConfirm={submitRemove}
      />
    </section>
  )
}
