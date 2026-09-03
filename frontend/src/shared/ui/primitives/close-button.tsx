import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from './button'

export function CloseButton({
  label,
  className,
  ...props
}: {
  label?: string
} & Omit<React.ComponentProps<typeof Button>, 'size' | 'variant' | 'children'>) {
  const { t } = useTranslation()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-close-button=""
      aria-label={label ?? t('action.close')}
      className={cn('size-8 shrink-0', className)}
      {...props}
    >
      <X className="size-4" aria-hidden="true" />
    </Button>
  )
}
