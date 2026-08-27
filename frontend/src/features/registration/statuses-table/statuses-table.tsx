import {
  CHANGE_SOURCE_LABEL,
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_LABEL,
} from '@/entities/registration/registration.labels'
import type { RegistrationStatusResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Dot } from '@/shared/ui/primitives/dot'

export function StatusesTable({
  items,
  selected,
  allSelected,
  onToggleAll,
  onToggleOne,
}: {
  items: RegistrationStatusResponse[]
  selected: Set<string>
  allSelected: boolean
  onToggleAll: (checked: boolean) => void
  onToggleOne: (participantId: string, checked: boolean) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              aria-label="Выбрать все"
              checked={allSelected}
              onCheckedChange={(checked) => onToggleAll(checked === true)}
            />
          </TableHead>
          <TableHead>Участник</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>Цикл</TableHead>
          <TableHead>Источник</TableHead>
          <TableHead>Отмечено</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <Checkbox
                aria-label={`Выбрать ${item.user.display_name}`}
                checked={selected.has(item.participant_id)}
                onCheckedChange={(checked) => onToggleOne(item.participant_id, checked === true)}
              />
            </TableCell>
            <TableCell>
              <span className="font-medium">{item.user.display_name}</span>
              <span className="ml-2 text-muted-foreground">{item.user.email}</span>
              {item.note && <p className="text-muted-foreground text-xs">Заметка: {item.note}</p>}
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1.5">
                <Dot className={REGISTRATION_STATUS_COLOR[item.status]} />
                {REGISTRATION_STATUS_LABEL[item.status]}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">{item.todo_cycle}</TableCell>
            <TableCell className="text-muted-foreground">
              {CHANGE_SOURCE_LABEL[item.last_change_source]}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.registered_at ? formatDateTime(item.registered_at) : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
