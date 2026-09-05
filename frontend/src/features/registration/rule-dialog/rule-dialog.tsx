import { useTranslation } from 'react-i18next'
import { formatOffsetMinutes } from '@/shared/datetime/datetime'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'

export type Direction = 'before' | 'after'

export function RuleDialog({
  open,
  isEditing,
  direction,
  days,
  hours,
  pending,
  onOpenChange,
  onDirectionChange,
  onDaysChange,
  onHoursChange,
  onCancel,
  onSubmit,
}: {
  open: boolean
  isEditing: boolean
  direction: Direction
  days: string
  hours: string
  pending: boolean
  onOpenChange: (open: boolean) => void
  onDirectionChange: (value: Direction) => void
  onDaysChange: (value: string) => void
  onHoursChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const { t } = useTranslation('registration')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('ruleDialog.editTitle') : t('ruleDialog.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label={t('ruleDialog.direction')} htmlFor="rule-direction">
            <Select
              value={direction}
              onValueChange={(value) => onDirectionChange(value as Direction)}
            >
              <SelectTrigger id="rule-direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">{t('ruleDialog.before')}</SelectItem>
                <SelectItem value="after">{t('ruleDialog.after')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('ruleDialog.days')} htmlFor="rule-days">
              <Input
                id="rule-days"
                type="number"
                min={0}
                value={days}
                onChange={(event) => onDaysChange(event.target.value)}
              />
            </Field>
            <Field label={t('ruleDialog.hours')} htmlFor="rule-hours">
              <Input
                id="rule-hours"
                type="number"
                min={0}
                max={23}
                value={hours}
                onChange={(event) => onHoursChange(event.target.value)}
              />
            </Field>
          </div>

          <p className="rounded-control border border-dashed p-3 text-copy">
            {t('ruleDialog.willFire')}{' '}
            {formatOffsetMinutes(
              (direction === 'before' ? 1 : -1) * (Number(days) * 1440 + Number(hours) * 60),
            )}
            .
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('common:action.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {isEditing ? t('common:action.save') : t('ruleDialog.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
