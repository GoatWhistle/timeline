import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from './button'

type RowActionProps = {
  label: string
} & Omit<React.ComponentProps<typeof Button>, 'size' | 'variant' | 'children'>

export const TOUCH_REACH =
  'relative after:absolute after:content-[""] pointer-coarse:after:-inset-1.5'

export function EditAction({ label, className, ...props }: RowActionProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-row-action="edit"
      aria-label={label}
      title={label}
      className={cn('size-8 shrink-0', TOUCH_REACH, className)}
      {...props}
    >
      <Pencil className="size-4" aria-hidden="true" />
    </Button>
  )
}

export function DeleteAction({ label, className, ...props }: RowActionProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-row-action="delete"
      aria-label={label}
      title={label}
      className={cn(
        'size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive',
        TOUCH_REACH,
        className,
      )}
      {...props}
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </Button>
  )
}
