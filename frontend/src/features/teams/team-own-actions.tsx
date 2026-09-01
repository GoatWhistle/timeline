import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAcceptTeamInvitation, useLeaveTeam, useRenameTeam } from '@/entities/team/team.queries'
import type { TeamResponse } from '@/shared/api/types.gen'
import { Input } from '@/shared/ui/forms/input'
import { Label } from '@/shared/ui/forms/label'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'

export function TeamOwnActions({ teamId, team }: { teamId: string; team: TeamResponse }) {
  const { t } = useTranslation('team')
  const navigate = useNavigate()
  const [renaming, setRenaming] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [name, setName] = useState(team.name)

  const rename = useRenameTeam(teamId)
  const accept = useAcceptTeamInvitation(teamId)
  const leave = useLeaveTeam(teamId)

  async function submitRename() {
    const trimmed = name.trim()
    if (trimmed === '') return
    try {
      await rename.mutateAsync({ name: trimmed })
      toast.success(t('renamed'))
      setRenaming(false)
    } catch {
      toast.error(t('renameFailed'))
    }
  }

  async function submitAccept() {
    try {
      await accept.mutateAsync()
      toast.success(t('accepted'))
    } catch {
      toast.error(t('acceptFailed'))
    }
  }

  async function submitLeave() {
    try {
      await leave.mutateAsync()
      toast.success(t('left'))
      setLeaving(false)
      navigate('/teams')
    } catch {
      toast.error(t('leaveFailed'))
    }
  }

  return (
    <>
      {team.my_state === 'INVITED' && (
        <Button onClick={submitAccept} disabled={accept.isPending}>
          {t('acceptInvitation')}
        </Button>
      )}
      {team.is_lead ? (
        <Button
          variant="outline"
          onClick={() => {
            setName(team.name)
            setRenaming(true)
          }}
        >
          {t('rename')}
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setLeaving(true)}>
          {t('leave')}
        </Button>
      )}

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('renameTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="team-rename">{t('nameLabel')}</Label>
            <Input
              id="team-rename"
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submitRename()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(false)}>
              {t('common:action.cancel')}
            </Button>
            <Button onClick={submitRename} disabled={name.trim() === '' || rename.isPending}>
              {t('renameSubmit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={leaving}
        onOpenChange={setLeaving}
        title={t('leaveConfirmTitle')}
        description={t('leaveConfirmBody')}
        confirmLabel={t('leave')}
        destructive
        disabled={leave.isPending}
        onConfirm={submitLeave}
      />
    </>
  )
}
