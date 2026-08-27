import { CHANNEL_LABEL } from '@/entities/notification/notification.labels'
import type { Channel } from '@/shared/api/types.gen'
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

export const AUTO_CHANNEL = 'AUTO'

export type Direction = 'before' | 'after'

export function RuleDialog({
  open,
  isEditing,
  direction,
  days,
  hours,
  channel,
  pending,
  onOpenChange,
  onDirectionChange,
  onDaysChange,
  onHoursChange,
  onChannelChange,
  onCancel,
  onSubmit,
}: {
  open: boolean
  isEditing: boolean
  direction: Direction
  days: string
  hours: string
  channel: Channel | typeof AUTO_CHANNEL
  pending: boolean
  onOpenChange: (open: boolean) => void
  onDirectionChange: (value: Direction) => void
  onDaysChange: (value: string) => void
  onHoursChange: (value: string) => void
  onChannelChange: (value: Channel | typeof AUTO_CHANNEL) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Изменение правила' : 'Новое правило напоминания'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Направление" htmlFor="rule-direction">
            <Select
              value={direction}
              onValueChange={(value) => onDirectionChange(value as Direction)}
            >
              <SelectTrigger id="rule-direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">до дедлайна — напоминание</SelectItem>
                <SelectItem value="after">после дедлайна — уведомление о просрочке</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Дней" htmlFor="rule-days">
              <Input
                id="rule-days"
                type="number"
                min={0}
                value={days}
                onChange={(event) => onDaysChange(event.target.value)}
              />
            </Field>
            <Field label="Часов" htmlFor="rule-hours">
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

          <Field
            label="Канал"
            htmlFor="rule-channel"
            hint="По умолчанию канал выбирается настройками пользователя"
          >
            <Select
              value={channel}
              onValueChange={(value) => onChannelChange(value as Channel | typeof AUTO_CHANNEL)}
            >
              <SelectTrigger id="rule-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO_CHANNEL}>По умолчанию</SelectItem>
                {(Object.keys(CHANNEL_LABEL) as Channel[]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {CHANNEL_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <p className="rounded-md border border-dashed p-3 text-sm">
            Правило сработает:{' '}
            {formatOffsetMinutes(
              (direction === 'before' ? 1 : -1) * (Number(days) * 1440 + Number(hours) * 60),
            )}
            .
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {isEditing ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
