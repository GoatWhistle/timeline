import { useTranslation } from 'react-i18next'
import type { EventColor } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import {
  EVENT_ORIGIN_SHAPE,
  eventColorAttrs,
  eventColorLabelKey,
  validEventColor,
} from './event-color'

export function EventColorMark({
  color,
  labelled = true,
  className,
}: {
  color: EventColor | null | undefined
  labelled?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const shape = color && validEventColor(color) ? EVENT_ORIGIN_SHAPE[color.family] : 'rounded-none'

  return (
    <span
      {...eventColorAttrs(color)}
      className={cn('inline-flex shrink-0 items-center', className)}
    >
      <span
        aria-hidden="true"
        className={cn('size-2.5 shrink-0 border-2 border-event-tint bg-event-fill-strong', shape)}
      />
      {labelled ? <span className="sr-only">{t(eventColorLabelKey(color))}</span> : null}
    </span>
  )
}
