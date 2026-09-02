import { Download, Upload, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRemoveAvatar, useUploadAvatar } from '@/entities/user/avatar.queries'
import { UserAvatar } from '@/entities/user/user-avatar'
import { ImageEditorOverlay } from '@/features/profile/image-editor/image-editor-overlay'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from '@/shared/ui/primitives/button'
import { AVATAR_ACCEPT, rejectionFor } from './avatar-file'

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
    inputRef.current?.focus()
  }

  async function download() {
    if (!avatarUrl) return
    try {
      const response = await fetch(avatarUrl, { credentials: 'include' })
      if (!response.ok) throw new Error(`avatar download failed with status ${response.status}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = avatarUrl.split('/').pop() ?? 'avatar'
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      toast.success(t('profile.avatarDownloaded'))
    } catch {
      toast.error(t('profile.avatarDownloadFailed'))
    }
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
              className="-right-1 -top-1 absolute size-6 rounded-pill border shadow-sm"
            >
              <X className="size-3" />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <label
              className={cn(
                'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control',
                'border bg-background px-3 font-medium text-caption transition-colors',
                'duration-instant ease-out hover:bg-accent-surface hover:text-accent-surface-foreground',
                'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
                busy && 'pointer-events-none opacity-50',
              )}
            >
              <Upload className="size-4" />
              {avatarUrl ? t('profile.avatarReplace') : t('profile.avatarUpload')}
              <input
                ref={inputRef}
                type="file"
                accept={AVATAR_ACCEPT}
                disabled={busy}
                className="sr-only"
                onChange={(event) => {
                  choose(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
            {avatarUrl ? (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={download}>
                <Download className="size-4" />
                {t('profile.avatarDownload')}
              </Button>
            ) : null}
          </div>
          <p className="text-caption text-muted-foreground">{t('profile.avatarHint')}</p>
        </div>
      </div>

      {pending ? (
        <ImageEditorOverlay source={pending} busy={busy} onCancel={closeEditor} onSave={save} />
      ) : null}
    </section>
  )
}
