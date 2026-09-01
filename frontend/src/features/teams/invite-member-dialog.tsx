import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useInviteTeamMember } from '@/entities/team/team.queries'
import { isApiError } from '@/shared/api/errors'
import { Input } from '@/shared/ui/forms/input'
import { Label } from '@/shared/ui/forms/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'
import { type InviteMode, InviteModeTabs } from './invite-mode-tabs'
import { JoinLinkPanel } from './join-link-panel'

export function InviteMemberDialog({
  teamId,
  open,
  onOpenChange,
}: {
  teamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('team')
  const [mode, setMode] = useState<InviteMode>('nickname')
  const [value, setValue] = useState('')
  const invite = useInviteTeamMember(teamId)

  async function submit() {
    const trimmed = value.trim()
    if (trimmed === '') return
    try {
      await invite.mutateAsync(mode === 'nickname' ? { nickname: trimmed } : { email: trimmed })
      toast.success(t('invited'))
      setValue('')
      onOpenChange(false)
    } catch (error) {
      toast.error(isApiError(error) ? error.localizedMessage : t('inviteFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('inviteTitle')}</DialogTitle>
          <DialogDescription>{t('inviteHint')}</DialogDescription>
        </DialogHeader>

        <InviteModeTabs
          value={mode}
          onChange={(next) => {
            setMode(next)
            setValue('')
          }}
        />

        {mode === 'link' ? (
          <JoinLinkPanel teamId={teamId} open={open} />
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="team-invite-value">
              {t(mode === 'nickname' ? 'inviteByNicknameLabel' : 'inviteByEmailLabel')}
            </Label>
            <Input
              id="team-invite-value"
              type={mode === 'email' ? 'email' : 'text'}
              value={value}
              placeholder={t(
                mode === 'nickname' ? 'inviteByNicknamePlaceholder' : 'inviteByEmailPlaceholder',
              )}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit()
              }}
            />
            <p className="text-caption text-muted-foreground">
              {t(mode === 'nickname' ? 'inviteByNicknameHint' : 'inviteByEmailHint')}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:action.close')}
          </Button>
          {mode !== 'link' && (
            <Button onClick={submit} disabled={value.trim() === '' || invite.isPending}>
              {t('inviteSubmit')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
