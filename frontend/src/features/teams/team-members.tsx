import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRemoveTeamMember } from '@/entities/team/team.queries'
import type { TeamMemberResponse } from '@/shared/api/types.gen'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { InviteMemberDialog } from './invite-member-dialog'
import { memberStateTone } from './member-state'

export function TeamMembers({
  teamId,
  members,
  isLead,
}: {
  teamId: string
  members: TeamMemberResponse[]
  isLead: boolean
}) {
  const { t } = useTranslation('team')
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columnUser')}</TableHead>
            <TableHead className="w-40">{t('columnState')}</TableHead>
            {isLead && <TableHead className="w-32">{t('columnActions')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {active.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
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
      </Table>

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
