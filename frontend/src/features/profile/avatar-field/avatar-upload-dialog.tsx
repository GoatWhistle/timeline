import { ImageUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('profile.avatarUploadTitle')}</DialogTitle>
        </DialogHeader>

        <div
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
            'flex flex-col items-center gap-3 rounded-surface border-2 border-dashed',
            'px-6 py-8 text-center transition-colors duration-base ease-out',
            over ? 'border-primary bg-accent-surface' : 'border-border bg-surface-1',
          )}
        >
          <span
            className={cn(
              'flex size-14 items-center justify-center rounded-pill',
              'transition-colors duration-base ease-out',
              over ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted-foreground',
            )}
          >
            <ImageUp className="size-6" aria-hidden="true" />
          </span>
          <span className="font-medium text-copy text-foreground">
            {t('profile.avatarUploadDrop')}
          </span>
          <span className="text-caption text-muted-foreground">
            {t('profile.avatarUploadFormats')}
          </span>
          <label
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'cursor-pointer',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
              'has-[:focus-visible]:outline-ring',
            )}
          >
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
        </div>

        <p className="text-caption text-muted-foreground">{t('profile.avatarUploadWarning')}</p>
      </DialogContent>
    </Dialog>
  )
}
