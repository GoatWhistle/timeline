import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveUrgency, URGENCY_KEY } from '@/entities/deadline/urgency/urgency'
import { formatDate } from '@/shared/datetime/datetime'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'
import { Button } from '@/shared/ui/primitives/button'
import type { MomentItem } from '../../model/row-items'
import { MARK_SIZE } from '../../model/schedule-scale'
import styles from './moment-mark.module.css'

export const MomentMark = memo(MomentMarkView)

export type MomentMarkProps = {
  item: MomentItem
  title: string
  offset: number
  highlighted: boolean
  now: Date
  onOpen: () => void
  onOpenEvent: () => void
}

function MomentMarkView({
  item,
  title,
  offset,
  highlighted,
  now,
  onOpen,
  onOpenEvent,
}: MomentMarkProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const isDeadline = item.moment === 'deadline'
  const urgency = resolveUrgency({
    deadlineAt: item.at,
    status: item.registrationStatus ?? null,
    now,
  })

  const name = isDeadline ? t('schedule.registrationDeadline') : item.name
  const label = isDeadline
    ? t('schedule.registrationDeadlineAria', {
        date: formatDate(item.at),
        urgency: t(URGENCY_KEY[urgency]),
      })
    : t('schedule.checkpointAria', { name, date: formatDate(item.at) })

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) onOpen()
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              tabIndex={-1}
              className={styles.mark}
              data-schedule-mark={item.id}
              data-moment={item.moment}
              data-hollow={isDeadline ? 'false' : 'true'}
              data-urgency={isDeadline ? urgency : undefined}
              data-highlighted={highlighted ? 'true' : 'false'}
              aria-label={label}
              style={{
                left: `${Math.min(1, Math.max(0, offset)) * 100}%`,
                ['--mark-size' as string]: `${MARK_SIZE}px`,
              }}
            />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{name}</p>
          <p className="text-muted-foreground">{formatDate(item.at)}</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-64" data-schedule-moment-popover={item.id}>
        <div className="flex flex-col gap-1">
          <p className="font-medium text-copy">{name}</p>
          <p className="text-caption text-muted-foreground">{title}</p>
          <p className="text-caption">{formatDate(item.at)}</p>
          <p className="text-caption text-muted-foreground">{t(URGENCY_KEY[urgency])}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            data-schedule-moment-open={item.id}
            onClick={() => {
              setOpen(false)
              onOpenEvent()
            }}
          >
            {t('schedule.momentOpenEvent')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
