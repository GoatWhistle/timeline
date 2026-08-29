import { useTranslation } from 'react-i18next'
import { STAGE_TYPE_ICON, STAGE_TYPE_KEY, STAGE_TYPE_TEXT } from '@/entities/stage/stage.labels'
import type { StageType } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'

export function StageTypeMark({
  type,
  labelled = true,
  className,
}: {
  type: StageType
  labelled?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const Icon = STAGE_TYPE_ICON[type]

  return (
    <span
      data-stage-type={type}
      className={cn('inline-flex shrink-0 items-center', STAGE_TYPE_TEXT[type], className)}
    >
      <Icon className="size-3.5 shrink-0" />
      {labelled ? <span className="sr-only">{t(STAGE_TYPE_KEY[type])}</span> : null}
    </span>
  )
}
