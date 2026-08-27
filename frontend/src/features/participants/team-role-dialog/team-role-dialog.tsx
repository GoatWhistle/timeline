import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'

export function TeamRoleDialog({
  open,
  value,
  disabled,
  onOpenChange,
  onValueChange,
  onCancel,
  onSave,
}: {
  open: boolean
  value: string
  disabled: boolean
  onOpenChange: (open: boolean) => void
  onValueChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  const { t } = useTranslation('registration')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('participants.teamRoleTitle')}</DialogTitle>
        </DialogHeader>
        <Field label={t('participants.roleLabel')} htmlFor="team-role">
          <Input
            id="team-role"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('common:action.cancel')}
          </Button>
          <Button disabled={!value.trim() || disabled} onClick={onSave}>
            {t('common:action.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
