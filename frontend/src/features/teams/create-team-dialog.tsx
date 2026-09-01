import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useCreateTeam } from '@/entities/team/team.queries'
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

export function CreateTeamDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('team')
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const create = useCreateTeam()

  async function submit() {
    const trimmed = name.trim()
    if (trimmed === '') return
    try {
      const created = await create.mutateAsync({ name: trimmed })
      toast.success(t('created'))
      setName('')
      onOpenChange(false)
      navigate(`/teams/${created.team.id}`)
    } catch {
      toast.error(t('createFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>{t('createHint')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="team-name">{t('nameLabel')}</Label>
          <Input
            id="team-name"
            value={name}
            maxLength={120}
            placeholder={t('namePlaceholder')}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit()
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:action.cancel')}
          </Button>
          <Button onClick={submit} disabled={name.trim() === '' || create.isPending}>
            {t('createSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
