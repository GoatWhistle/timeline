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
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
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
import { Dot } from '@/shared/ui/primitives/dot'
import { EditAction } from '@/shared/ui/primitives/row-actions'

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
                aria-label={t('participants.select', { name: listName(item.user, locale) })}
                disabled={item.participation_status !== 'ASSIGNED'}
                checked={selected.has(item.id)}
                onCheckedChange={(checked) => onToggleOne(item.id, checked === true)}
              />
            </TableCell>
            <TableCell>
              <span className="font-medium">{listName(item.user, locale)}</span>
              <span className="ml-2 text-muted-foreground">{item.user.email}</span>
            </TableCell>
            <TableCell>{item.team_role}</TableCell>
            <TableCell>
              <Badge tone={item.participation_status === 'ASSIGNED' ? 'primary' : 'danger'}>
                {t(PARTICIPATION_STATUS_KEY[item.participation_status])}
              </Badge>
              {item.removed_at && (
                <span className="ml-2 text-muted-foreground text-caption">
                  {formatDate(item.removed_at)}
                </span>
              )}
            </TableCell>
            <TableCell>
              {item.registration_status ? (
                <span className="inline-flex items-center gap-1.5">
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
              <div className="flex gap-1">
                <EditAction
                  label={t('participants.editRole', { name: listName(item.user, locale) })}
                  onClick={() => onEdit(item)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
