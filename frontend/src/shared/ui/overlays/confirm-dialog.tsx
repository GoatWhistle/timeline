import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useReturnFocus } from '@/shared/hooks/use-return-focus/use-return-focus'
import { cn } from '@/shared/styling/class-names/class-names'
import { buttonVariants } from '@/shared/ui/primitives/button'
import { PANEL_MOTION, PANEL_SURFACE, SCRIM } from './overlay-chrome'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  disabled?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  disabled = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const returnFocus = useReturnFocus(open)

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={SCRIM} />
        <AlertDialogPrimitive.Content
          onCloseAutoFocus={returnFocus}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 p-6',
            PANEL_SURFACE,
            PANEL_MOTION,
          )}
        >
          <AlertDialogPrimitive.Title className="font-semibold text-heading">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description asChild>
            <div className="text-meta text-muted-foreground">{description}</div>
          </AlertDialogPrimitive.Description>
          <div className="flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }))}>
              {cancelLabel ?? t('action.cancel')}
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              disabled={disabled}
              onClick={onConfirm}
              className={cn(
                buttonVariants({ variant: destructive ? 'destructive' : 'default' }),
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              {confirmLabel ?? t('action.confirm')}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
