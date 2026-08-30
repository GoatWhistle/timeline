import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export const Dialog = DialogPrimitive.Root

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  const { t } = useTranslation()

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-black/50',
          'data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in-0',
          'data-[state=open]:motion-safe:duration-base data-[state=open]:motion-safe:ease-out',
          'data-[state=closed]:motion-safe:animate-out data-[state=closed]:motion-safe:fade-out-0',
          'data-[state=closed]:motion-safe:duration-base-exit data-[state=closed]:motion-safe:ease-in',
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg',
          'max-h-[90vh] overflow-y-auto',
          'data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in-0',
          'data-[state=open]:motion-safe:zoom-in-95 data-[state=open]:motion-safe:duration-base',
          'data-[state=open]:motion-safe:ease-out',
          'data-[state=closed]:motion-safe:animate-out data-[state=closed]:motion-safe:fade-out-0',
          'data-[state=closed]:motion-safe:zoom-out-95 data-[state=closed]:motion-safe:duration-base-exit',
          'data-[state=closed]:motion-safe:ease-in',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity duration-instant ease-out hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <X className="size-4" />
          <span className="sr-only">{t('action.close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex justify-end gap-2', className)} {...props} />
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title className={cn('font-semibold text-heading', className)} {...props} />
  )
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-meta text-muted-foreground', className)}
      {...props}
    />
  )
}
