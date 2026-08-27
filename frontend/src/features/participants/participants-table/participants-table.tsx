import { Pencil, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PARTICIPATION_STATUS_KEY } from '@/entities/participant/participant.labels'
import {
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_KEY,
} from '@/entities/registration/registration.labels'
import type { ParticipantResponse } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { Dot } from '@/shared/ui/primitives/dot'

export function ParticipantsTable({
  items,
  selected,
  allSelected,
  reactivatePending,
  onToggleAll,
  onToggleOne,
  onEdit,
  onReactivate,
}: {
  items: ParticipantResponse[]
  selected: Set<string>
  allSelected: boolean
  reactivatePending: boolean
  onToggleAll: (checked: boolean) => void
  onToggleOne: (id: string, checked: boolean) => void
  onEdit: (item: ParticipantResponse) => void
  onReactivate: (item: ParticipantResponse) => void
}) {
  const { t } = useTranslation('registration')
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              aria-label={t('participants.selectAll')}
              checked={allSelected}
              onCheckedChange={(checked) => onToggleAll(checked === true)}
            />
          </TableHead>
          <TableHead>{t('participants.columnParticipant')}</TableHead>
          <TableHead>{t('participants.columnRole')}</TableHead>
          <TableHead>{t('participants.columnParticipation')}</TableHead>
          <TableHead>{t('participants.columnRegistration')}</TableHead>
          <TableHead className="w-24">{t('participants.columnActions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} data-state={selected.has(item.id) ? 'selected' : undefined}>
            <TableCell>
              <Checkbox
                aria-label={t('participants.select', { name: item.user.display_name })}
                disabled={item.participation_status !== 'ASSIGNED'}
                checked={selected.has(item.id)}
                onCheckedChange={(checked) => onToggleOne(item.id, checked === true)}
              />
            </TableCell>
            <TableCell>
              <span className="font-medium">{item.user.display_name}</span>
              <span className="ml-2 text-muted-foreground">{item.user.email}</span>
            </TableCell>
            <TableCell>{item.team_role}</TableCell>
            <TableCell>
              <Badge tone={item.participation_status === 'ASSIGNED' ? 'primary' : 'danger'}>
                {PARTICIPATION_STATUS_KEY[item.participation_status]}
              </Badge>
              {item.removed_at && (
                <span className="ml-2 text-muted-foreground text-xs">
                  {formatDate(item.removed_at)}
                </span>
              )}
            </TableCell>
            <TableCell>
              {item.registration_status ? (
                <span className="inline-flex items-center gap-1.5">
                  <Dot className={REGISTRATION_STATUS_COLOR[item.registration_status.status]} />
                  {REGISTRATION_STATUS_KEY[item.registration_status.status]}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('participants.editRole', { name: item.user.display_name })}
                  onClick={() => onEdit(item)}
                >
                  <Pencil className="size-4" />
                </Button>
                {item.participation_status === 'REMOVED' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('participants.restore', { name: item.user.display_name })}
                    disabled={reactivatePending}
                    onClick={() => onReactivate(item)}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
