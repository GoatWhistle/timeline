import { Download } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRemoveAvatar, useUploadAvatar } from '@/entities/user/avatar.queries'
import { UserAvatar } from '@/entities/user/user-avatar'
import { ImageEditorOverlay } from '@/features/profile/image-editor/image-editor-overlay'
import { TOUCH_QUERY } from '@/shared/ui/layout/mobile/mobile-state'
import { useMediaQuery } from '@/shared/ui/layout/mobile/use-phone-viewport'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { AvatarActions } from './avatar-actions'
import { type AvatarRejection, downloadAvatar } from './avatar-file'
import { AvatarUploadDialog } from './avatar-upload-dialog'

export function AvatarField({
  seed,
  firstName,
  lastName,
  avatarUrl,
}: {
  seed: string
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
}) {
  const { t } = useTranslation()
  const headingId = useId()
  const [pending, setPending] = useState<Blob | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [uploading, setUploading] = useState(false)
  const touch = useMediaQuery(TOUCH_QUERY)
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()

  function refuse(rejection: AvatarRejection) {
    toast.error(rejection === 'type' ? t('profile.avatarWrongType') : t('profile.avatarTooLarge'))
  }

  function accept(file: File) {
    setUploading(false)
    setPending(file)
  }

  async function save(blob: Blob) {
    try {
      await upload.mutateAsync(blob)
      setPending(null)
      toast.success(t('profile.avatarSaved'))
    } catch {
      toast.error(t('profile.avatarUploadFailed'))
    }
  }

  async function edit() {
    if (!avatarUrl) return
    try {
      const response = await fetch(avatarUrl, { credentials: 'include' })
      if (!response.ok) throw new Error(`avatar fetch failed with status ${response.status}`)
      setPending(await response.blob())
    } catch {
      toast.error(t('profile.avatarDownloadFailed'))
    }
  }

  async function download() {
    if (!avatarUrl) return
    try {
      await downloadAvatar(avatarUrl)
      toast.success(t('profile.avatarDownloaded'))
    } catch {
      toast.error(t('profile.avatarDownloadFailed'))
    }
  }

  async function clear() {
    setConfirming(false)
    try {
      await remove.mutateAsync()
      toast.success(t('profile.avatarRemoved'))
    } catch {
      toast.error(t('profile.avatarRemoveFailed'))
    }
  }

  const busy = upload.isPending || remove.isPending

  return (
    <section aria-labelledby={headingId} className="flex flex-col items-center gap-3">
      <h3 id={headingId} className="sr-only">
        {t('profile.avatar')}
      </h3>

      <div className="group relative">
        <UserAvatar
          seed={seed}
          firstName={firstName}
          lastName={lastName}
          avatarUrl={avatarUrl}
          className="size-40 text-screen sm:size-48"
        />
        <AvatarActions
          hasAvatar={Boolean(avatarUrl)}
          busy={busy}
          visible={touch}
          onUpload={() => setUploading(true)}
          onEdit={edit}
          onRemove={() => setConfirming(true)}
        />
      </div>

      {avatarUrl ? (
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={download}>
          <Download className="size-4" aria-hidden="true" />
          {t('profile.avatarDownload')}
        </Button>
      ) : null}

      {pending ? (
        <ImageEditorOverlay
          source={pending}
          busy={busy}
          onCancel={() => setPending(null)}
          onSave={save}
        />
      ) : null}

      <AvatarUploadDialog
        open={uploading}
        onOpenChange={setUploading}
        onAccepted={accept}
        onRejected={refuse}
      />

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('profile.avatarRemoveTitle')}
        description={t('profile.avatarRemoveConfirm')}
        confirmLabel={t('profile.avatarRemove')}
        destructive
        disabled={busy}
        onConfirm={clear}
      />
    </section>
  )
}
