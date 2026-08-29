import { MailSearch } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CHANGE_SOURCE_KEY,
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_KEY,
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
import { Button } from '@/shared/ui/primitives/button'
import { Dot } from '@/shared/ui/primitives/dot'

export function StatusesTable({
  items,
  selected,
  allSelected,
  onToggleAll,
  onToggleOne,
  onPreview,
}: {
  items: RegistrationStatusResponse[]
  selected: Set<string>
  allSelected: boolean
  onToggleAll: (checked: boolean) => void
  onToggleOne: (participantId: string, checked: boolean) => void
  onPreview?: (statusId: string) => void
}) {
  const { t } = useTranslation('registration')
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              aria-label={t('statuses.selectAll')}
              checked={allSelected}
              onCheckedChange={(checked) => onToggleAll(checked === true)}
            />
          </TableHead>
          <TableHead>{t('statuses.participant')}</TableHead>
          <TableHead>{t('statuses.status')}</TableHead>
          <TableHead>{t('statuses.cycle')}</TableHead>
          <TableHead>{t('statuses.source')}</TableHead>
          <TableHead>{t('statuses.markedAt')}</TableHead>
          {onPreview ? <TableHead className="w-12" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <Checkbox
                aria-label={t('statuses.select', { name: item.user.display_name })}
                checked={selected.has(item.participant_id)}
                onCheckedChange={(checked) => onToggleOne(item.participant_id, checked === true)}
              />
            </TableCell>
            <TableCell>
              <span className="font-medium">{item.user.display_name}</span>
              <span className="ml-2 text-muted-foreground">{item.user.email}</span>
              {item.note && (
                <p className="text-muted-foreground text-xs">
                  {t('statuses.note', { note: item.note })}
                </p>
              )}
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1.5">
                <Dot className={REGISTRATION_STATUS_COLOR[item.status]} />
                {REGISTRATION_STATUS_KEY[item.status]}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">{item.todo_cycle}</TableCell>
            <TableCell className="text-muted-foreground">
              {CHANGE_SOURCE_KEY[item.last_change_source]}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.registered_at ? formatDateTime(item.registered_at) : '—'}
            </TableCell>
            {onPreview ? (
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('notification:preview.open')}
                  onClick={() => onPreview(item.id)}
                >
                  <MailSearch className="size-4" aria-hidden="true" />
                </Button>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
