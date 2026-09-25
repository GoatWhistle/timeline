import { SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { TAP_TARGET } from '@/shared/ui/layout/mobile/mobile-state'
import { Button, type ButtonProps } from '@/shared/ui/primitives/button'

export function FilterTrigger({
  count,
  touch = false,
  className,
  ...props
}: ButtonProps & { count: number; touch?: boolean }) {
  const { t } = useTranslation()
  const label = count > 0 ? t('filters.titleActive', { count }) : t('filters.title')

  return (
    <Button
      variant="outline"
      aria-label={label}
      title={label}
      data-filter-trigger=""
      className={cn('relative shrink-0 p-0', touch ? TAP_TARGET : 'size-9', className)}
      {...props}
    >
      <SlidersHorizontal className="size-4" aria-hidden="true" />
      {count > 0 && (
        <span
          key={count}
          aria-hidden="true"
          data-filter-count=""
          className={cn(
            'absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-pill',
            'bg-primary font-medium text-caption text-primary-foreground tabular-nums leading-none',
            'motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fade-in-0',
            'motion-safe:duration-fast motion-safe:ease-out',
          )}
        >
          {count}
        </span>
      )}
    </Button>
  )
}
