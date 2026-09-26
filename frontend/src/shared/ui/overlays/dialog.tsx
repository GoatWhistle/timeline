import * as DialogPrimitive from '@radix-ui/react-dialog'
import type * as React from 'react'
import { createContext, useContext } from 'react'
import { useReturnFocus } from '@/shared/hooks/use-return-focus/use-return-focus'
import { cn } from '@/shared/styling/class-names/class-names'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import {
  PANEL_MOTION,
  PANEL_SURFACE,
  SCRIM,
  SHEET_MOTION,
  SHEET_PLACE,
  STILL_SCRIM,
} from './overlay-chrome'

function motionFor(sheet: boolean, still: boolean): string {
  if (still) return ''
  return sheet ? SHEET_MOTION : PANEL_MOTION
}

const ReturnFocusContext = createContext<((event?: Event) => void) | null>(null)

export function Dialog({
  open,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const returnFocus = useReturnFocus(open ?? false)

  return (
    <DialogPrimitive.Root open={open} {...props}>
      <ReturnFocusContext.Provider value={returnFocus}>{children}</ReturnFocusContext.Provider>
    </DialogPrimitive.Root>
  )
}

export function DialogContent({
  className,
  children,
  onCloseAutoFocus,
  hideClose = false,
  sheet = false,
  still = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  hideClose?: boolean
  sheet?: boolean
  still?: boolean
}) {
  const returnFocus = useContext(ReturnFocusContext)

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={still ? STILL_SCRIM : SCRIM} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-sheet={sheet ? '' : undefined}
        onCloseAutoFocus={onCloseAutoFocus ?? returnFocus ?? undefined}
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 p-6',
          'max-h-[90vh] overflow-y-auto',
          PANEL_SURFACE,
          sheet && SHEET_PLACE,
          motionFor(sheet, still),
          className,
        )}
        {...props}
      >
        {hideClose ? null : (
          <DialogPrimitive.Close asChild>
            <CloseButton className="absolute top-3 right-3" />
          </DialogPrimitive.Close>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export const DialogClose = DialogPrimitive.Close

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
