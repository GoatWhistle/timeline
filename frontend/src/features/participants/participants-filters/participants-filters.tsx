import { Copy, Plus } from 'lucide-react'
import {
  REGISTRATION_STATUS_LABEL,
  REGISTRATION_STATUSES,
} from '@/entities/registration/registration.labels'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Button } from '@/shared/ui/primitives/button'

export const ALL = 'ALL'

export function ParticipantsFilters({
  roleInput,
  status,
  removed,
  onRoleInputChange,
  onStatusChange,
  onRemovedToggle,
  onCopy,
  onAdd,
}: {
  roleInput: string
  status: string
  removed: string
  onRoleInputChange: (value: string) => void
  onStatusChange: (value: string) => void
  onRemovedToggle: () => void
  onCopy: () => void
  onAdd: () => void
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-52">
          <Input
            aria-label="Фильтр по роли"
            placeholder="Роль в команде"
            value={roleInput}
            onChange={(event) => onRoleInputChange(event.target.value)}
          />
        </div>
        <div className="w-56">
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger aria-label="Статус регистрации">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Любой статус</SelectItem>
              {REGISTRATION_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {REGISTRATION_STATUS_LABEL[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant={removed === '1' ? 'default' : 'outline'} onClick={onRemovedToggle}>
          Показывать удалённых
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCopy}>
          <Copy className="size-4" />
          Скопировать состав
        </Button>
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          Добавить
        </Button>
      </div>
    </div>
  )
}
