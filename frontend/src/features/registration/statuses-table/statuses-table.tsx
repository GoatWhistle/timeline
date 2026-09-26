import { MailSearch } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CHANGE_SOURCE_KEY,
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_KEY,
  REGISTRATION_STATUS_SHAPE,
} from '@/entities/registration/registration.labels'
import { listName } from '@/entities/user/person-name/person-name'
import type { RegistrationStatusResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
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
import { Button } from '@/shared/ui/primitives/button'
import { Dot } from '@/shared/ui/primitives/dot'

const STATUS_COLUMNS: TableColumn[] = [
  { id: 'select', width: 44, fixed: true },
  { id: 'participant', width: 260 },
  { id: 'status', width: 160 },
  { id: 'source', width: 160 },
  { id: 'markedAt', width: 180 },
]

const PREVIEW_COLUMN: TableColumn = { id: 'preview', width: 56, fixed: true }

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
  const { locale } = useLocale()
  return (
    <ResizableTable
      storageKey="timeline-statuses-widths"
      columns={onPreview ? [...STATUS_COLUMNS, PREVIEW_COLUMN] : STATUS_COLUMNS}
      flexible="participant"
    >
      <TableHeader>
        <TableRow>
          <TableHead className="text-center">
            <Checkbox
              aria-label={t('statuses.selectAll')}
              checked={allSelected}
              onCheckedChange={(checked) => onToggleAll(checked === true)}
            />
          </TableHead>
          <ResizableHead column="participant" label={t('statuses.participant')} />
          <ResizableHead column="status" label={t('statuses.status')} />
          <ResizableHead column="source" label={t('statuses.source')} />
          <ResizableHead column="markedAt" label={t('statuses.markedAt')} />
          {onPreview ? <TableHead /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <Checkbox
                aria-label={t('statuses.select', { name: listName(item.user, locale) })}
                checked={selected.has(item.participant_id)}
                onCheckedChange={(checked) => onToggleOne(item.participant_id, checked === true)}
              />
            </TableCell>
            <TableCell data-lead="">
              <span className="font-medium">{listName(item.user, locale)}</span>
              <span className="ml-2 text-muted-foreground">{item.user.email}</span>
              {item.note && (
                <p className="truncate text-muted-foreground text-caption">
                  {t('statuses.note', { note: item.note })}
                </p>
              )}
            </TableCell>
            <TableCell className="truncate">
              <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
                <Dot
                  shape={REGISTRATION_STATUS_SHAPE[item.status]}
                  className={REGISTRATION_STATUS_COLOR[item.status]}
                />
                {t(REGISTRATION_STATUS_KEY[item.status])}
              </span>
            </TableCell>
            <TableCell className="truncate text-muted-foreground">
              {t(CHANGE_SOURCE_KEY[item.last_change_source])}
            </TableCell>
            <TableCell className="truncate text-muted-foreground">
              {item.registered_at ? formatDateTime(item.registered_at) : <NoValue />}
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
    </ResizableTable>
  )
}
