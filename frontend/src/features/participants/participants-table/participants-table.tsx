import { useTranslation } from 'react-i18next'
import { PARTICIPATION_STATUS_KEY } from '@/entities/participant/participant.labels'
import {
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_KEY,
  REGISTRATION_STATUS_SHAPE,
} from '@/entities/registration/registration.labels'
import { listName } from '@/entities/user/person-name/person-name'
import type { ParticipantResponse } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
import { useLocale } from '@/shared/i18n/i18n-context'
import {
  ResizableHead,
  ResizableTable,
  type TableColumn,
} from '@/shared/ui/data-display/column-resize/resizable-table'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Badge } from '@/shared/ui/primitives/badge'
import { Dot } from '@/shared/ui/primitives/dot'
import { EditAction } from '@/shared/ui/primitives/row-actions'

const PARTICIPANT_COLUMNS: TableColumn[] = [
  { id: 'select', width: 44, fixed: true },
  { id: 'participant', width: 260 },
  { id: 'role', width: 150 },
  { id: 'participation', width: 170 },
  { id: 'registration', width: 160 },
  { id: 'actions', width: 110 },
]

export function ParticipantsTable({
  items,
  selected,
  allSelected,
  onToggleAll,
  onToggleOne,
  onEdit,
}: {
  items: ParticipantResponse[]
  selected: Set<string>
  allSelected: boolean
  onToggleAll: (checked: boolean) => void
  onToggleOne: (id: string, checked: boolean) => void
  onEdit: (item: ParticipantResponse) => void
}) {
  const { t } = useTranslation('registration')
  const { locale } = useLocale()
  return (
    <ResizableTable
      storageKey="timeline-participants-widths"
      columns={PARTICIPANT_COLUMNS}
      flexible="participant"
    >
      <TableHeader>
        <TableRow>
          <TableHead className="text-center">
            <Checkbox
              aria-label={t('participants.selectAll')}
              checked={allSelected}
              onCheckedChange={(checked) => onToggleAll(checked === true)}
            />
          </TableHead>
          <ResizableHead column="participant" label={t('participants.columnParticipant')} />
          <ResizableHead column="role" label={t('participants.columnRole')} />
          <ResizableHead column="participation" label={t('participants.columnParticipation')} />
          <ResizableHead column="registration" label={t('participants.columnRegistration')} />
          <ResizableHead column="actions" label={t('participants.columnActions')} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} data-state={selected.has(item.id) ? 'selected' : undefined}>
            <TableCell>
              <Checkbox
                aria-label={t('participants.select', { name: listName(item.user, locale) })}
                disabled={item.participation_status !== 'ASSIGNED'}
                checked={selected.has(item.id)}
                onCheckedChange={(checked) => onToggleOne(item.id, checked === true)}
              />
            </TableCell>
            <TableCell data-lead="" className="truncate">
              <span className="font-medium">{listName(item.user, locale)}</span>
              <span className="ml-2 text-muted-foreground">{item.user.email}</span>
            </TableCell>
            <TableCell className="truncate">{item.team_role}</TableCell>
            <TableCell className="truncate">
              <Badge tone={item.participation_status === 'ASSIGNED' ? 'primary' : 'danger'}>
                {t(PARTICIPATION_STATUS_KEY[item.participation_status])}
              </Badge>
              {item.removed_at && (
                <span className="ml-2 text-muted-foreground text-caption">
                  {formatDate(item.removed_at)}
                </span>
              )}
            </TableCell>
            <TableCell className="truncate">
              {item.registration_status ? (
                <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
                  <Dot
                    shape={REGISTRATION_STATUS_SHAPE[item.registration_status.status]}
                    className={REGISTRATION_STATUS_COLOR[item.registration_status.status]}
                  />
                  {t(REGISTRATION_STATUS_KEY[item.registration_status.status])}
                </span>
              ) : (
                <NoValue />
              )}
            </TableCell>
            <TableCell>
              <div className="flex justify-center gap-1">
                <EditAction
                  label={t('participants.editRole', { name: listName(item.user, locale) })}
                  onClick={() => onEdit(item)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResizableTable>
  )
}
