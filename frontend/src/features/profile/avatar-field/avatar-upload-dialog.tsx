import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { ImageUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReturnFocus } from '@/shared/hooks/use-return-focus/use-return-focus'
import { cn } from '@/shared/styling/class-names/class-names'
import { PANEL_MOTION, PANEL_SURFACE, SCRIM } from '@/shared/ui/overlays/overlay-chrome'
import { buttonVariants } from '@/shared/ui/primitives/button'
import { acceptDropped } from './avatar-drop'
import { AVATAR_ACCEPT, type AvatarRejection, rejectionFor } from './avatar-file'

export function AvatarUploadDialog({
  open,
  onOpenChange,
  onAccepted,
  onRejected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccepted: (file: File) => void
  onRejected: (rejection: AvatarRejection) => void
}) {
  const { t } = useTranslation()
  const returnFocus = useReturnFocus(open)
  const [over, setOver] = useState(false)

  function take(file: File | undefined) {
    if (!file) return
    const rejection = rejectionFor(file)
    if (rejection) {
      onRejected(rejection)
      return
    }
    onAccepted(file)
  }

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
            {t('profile.avatarUploadTitle')}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description asChild>
            <div className="text-meta text-muted-foreground">
              {t('profile.avatarUploadWarning')}
            </div>
          </AlertDialogPrimitive.Description>

          <section
            aria-label={t('profile.avatarUploadDrop')}
            data-drop-zone
            data-over={over ? 'true' : undefined}
            onDragOver={(event) => {
              event.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
              event.preventDefault()
              setOver(false)
              const outcome = acceptDropped(event.dataTransfer)
              if (!outcome) return
              if ('rejection' in outcome) {
                onRejected(outcome.rejection)
                return
              }
              onAccepted(outcome.file)
            }}
            className={cn(
              'flex flex-col items-center gap-3 rounded-control border border-border border-dashed',
              'px-4 py-6 text-center transition-colors duration-instant ease-out',
              over && 'border-primary bg-accent-surface',
            )}
          >
            <ImageUp className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-copy">{t('profile.avatarUploadDrop')}</p>
            <p className="text-caption text-muted-foreground">{t('profile.avatarUploadOr')}</p>
            <label className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}>
              {t('profile.avatarUploadChoose')}
              <input
                type="file"
                accept={AVATAR_ACCEPT}
                className="sr-only"
                onChange={(event) => {
                  take(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
            <p className="text-caption text-muted-foreground">{t('profile.avatarUploadFormats')}</p>
          </section>

          <div className="flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }))}>
              {t('action.cancel')}
            </AlertDialogPrimitive.Cancel>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
