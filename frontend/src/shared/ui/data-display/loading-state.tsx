import { cn } from '@/shared/styling/class-names/class-names'
import { Spinner } from './spinner'

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <Spinner className="size-5" />
    </div>
  )
}
