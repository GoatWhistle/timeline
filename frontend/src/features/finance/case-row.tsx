import { useTranslation } from 'react-i18next'
import type { EventCaseResponse } from '@/shared/api/types.gen'
import { MarkdownView } from '@/shared/markdown/markdown-view'
import { formatMoney } from '@/shared/money/money'
import { Badge } from '@/shared/ui/primitives/badge'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'

export function CaseRow({
  item,
  currency,
  onEdit,
  onDelete,
}: {
  item: EventCaseResponse
  currency: string | undefined
  onEdit?: (() => void) | undefined
  onDelete?: (() => void) | undefined
}) {
  const { t } = useTranslation('event')
  const prize =
    item.prize_amount === undefined
      ? null
      : (formatMoney(item.prize_amount, currency) ?? item.prize_amount)

  return (
    <li
      data-case-row
      className="flex flex-col gap-2 rounded-control border border-border bg-surface-1 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
          <h4 className="flex min-w-0 items-center gap-2 font-medium text-heading">
            <Badge tone="neutral" className="shrink-0 tabular-nums">
              {item.case_no}
            </Badge>
            <span className="min-w-0 break-words">{item.name}</span>
          </h4>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            <span>{item.partner ?? t('cases.noPartner')}</span>
            <span>{item.track_name ?? t('cases.noTrack')}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-2 font-semibold text-copy text-prize tabular-nums">
            {prize ?? <span className="text-muted-foreground">{t('cases.noPrize')}</span>}
          </span>
          {onEdit && (
            <EditAction label={t('cases.editAria', { name: item.name })} onClick={onEdit} />
          )}
          {onDelete && (
            <DeleteAction label={t('cases.deleteAria', { name: item.name })} onClick={onDelete} />
          )}
        </div>
      </div>

      {item.description && (
        <MarkdownView source={item.description} className="text-muted-foreground" />
      )}
    </li>
  )
}
