import * as DialogPrimitive from '@radix-ui/react-dialog'
import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import { PANEL_MOTION, PANEL_SURFACE, SCRIM } from './overlay-chrome'

export const Dialog = DialogPrimitive.Root

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={SCRIM} />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 p-6',
          'max-h-[90vh] overflow-y-auto',
          PANEL_SURFACE,
          PANEL_MOTION,
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Close asChild>
          <CloseButton className="absolute top-3 right-3" />
        </DialogPrimitive.Close>
        {children}
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
