import { Download, Upload, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRemoveAvatar, useUploadAvatar } from '@/entities/user/avatar.queries'
import { UserAvatar } from '@/entities/user/user-avatar'
import { ImageEditorOverlay } from '@/features/profile/image-editor/image-editor-overlay'
import { Button } from '@/shared/ui/primitives/button'
import { AVATAR_ACCEPT, rejectionFor } from './avatar-file'
import { openFilePicker } from './open-file-picker'

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
  const inputRef = useRef<HTMLInputElement | null>(null)
  const uploadRef = useRef<HTMLButtonElement | null>(null)
  const headingId = useId()
  const [pending, setPending] = useState<Blob | null>(null)
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()

  function choose(file: File | undefined) {
    if (!file) return
    const rejection = rejectionFor(file)
    if (rejection === 'type') {
      toast.error(t('profile.avatarWrongType'))
      return
    }
    if (rejection === 'size') {
      toast.error(t('profile.avatarTooLarge'))
      return
    }
    setPending(file)
  }

  function pick() {
    const input = inputRef.current
    if (!input) {
      toast.error(t('profile.avatarPickerFailed'))
      return
    }
    input.value = ''
    if (!openFilePicker(input)) toast.error(t('profile.avatarPickerFailed'))
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

  function closeEditor() {
    setPending(null)
    uploadRef.current?.focus()
  }

  async function clear() {
    try {
      await remove.mutateAsync()
      toast.success(t('profile.avatarRemoved'))
    } catch {
      toast.error(t('profile.avatarRemoveFailed'))
    }
  }

  const busy = upload.isPending || remove.isPending

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="font-medium text-copy">
        {t('profile.avatar')}
      </h3>

      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar
            seed={seed}
            firstName={firstName}
            lastName={lastName}
            avatarUrl={avatarUrl}
            className="size-16 text-copy"
          />
          {avatarUrl ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={t('profile.avatarRemove')}
              title={t('profile.avatarRemove')}
              disabled={busy}
              onClick={clear}
              className="-right-1 -top-1 absolute size-6 rounded-full border shadow-sm"
            >
              <X className="size-3" />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              ref={uploadRef}
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={pick}
            >
              <Upload className="size-4" />
              {avatarUrl ? t('profile.avatarReplace') : t('profile.avatarUpload')}
            </Button>
            {avatarUrl ? (
              <Button asChild variant="ghost" size="sm">
                <a href={avatarUrl} download target="_blank" rel="noreferrer">
                  <Download className="size-4" />
                  {t('profile.avatarDownload')}
                </a>
              </Button>
            ) : null}
          </div>
          <p className="text-caption text-muted-foreground">{t('profile.avatarHint')}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute size-0 opacity-0"
        onChange={(event) => {
          choose(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {pending ? (
        <ImageEditorOverlay source={pending} busy={busy} onCancel={closeEditor} onSave={save} />
      ) : null}
    </section>
  )
}
