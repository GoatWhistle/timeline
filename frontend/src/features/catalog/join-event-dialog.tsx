import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useJoinEvent } from '@/entities/catalog/catalog.queries'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'

export function JoinEventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: CatalogEvent
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('event')
  const [teamRole, setTeamRole] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const join = useJoinEvent(event.id)
  const roleRequired = event.kind === 'HACKATHON'

  function submit() {
    const role = teamRole.trim()
    if (roleRequired && role === '') {
      setError(t('catalog.join.roleRequired'))
      return
    }
    setError(undefined)
    join.mutate(role === '' ? {} : { team_role: role }, {
      onSuccess: () => {
        toast.success(t('catalog.join.done'), { description: event.title })
        setTeamRole('')
        onOpenChange(false)
      },
      onError: () => toast.error(t('catalog.join.failed')),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('catalog.join.title')}</DialogTitle>
          <DialogDescription>
            {roleRequired ? t('catalog.join.hint') : t('catalog.join.meetupHint')}
          </DialogDescription>
        </DialogHeader>

        <Field
          label={t('card.teamRole')}
          htmlFor="join-team-role"
          error={error}
          hint={roleRequired ? undefined : t('catalog.join.roleOptional')}
        >
          <Input
            id="join-team-role"
            value={teamRole}
            maxLength={80}
            onChange={(e) => setTeamRole(e.target.value)}
          />
        </Field>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('catalog.join.cancel')}
          </Button>
          <Button onClick={submit} disabled={join.isPending}>
            {t('catalog.join.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
