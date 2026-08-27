import { formatDateTime } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'

export function DeadlineMark({ deadline, left }: { deadline: string; left: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Дедлайн регистрации ${formatDateTime(deadline)}`}
          className={cn(
            'absolute top-1 bottom-1 z-20 w-0.5 bg-destructive',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            'before:absolute before:top-0 before:bottom-0 before:-left-[9px] before:-right-[9px] before:content-[""]',
          )}
          style={{ left }}
        />
      </TooltipTrigger>
      <TooltipContent>Дедлайн регистрации: {formatDateTime(deadline)}</TooltipContent>
    </Tooltip>
  )
}
