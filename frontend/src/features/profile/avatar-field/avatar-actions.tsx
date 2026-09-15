import { Download, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'

const ROUND_ACTION = cn(
  'size-10 rounded-pill border border-border bg-surface-1/90 shadow-raised backdrop-blur-sm',
  'hover:bg-accent-surface hover:text-accent-surface-foreground',
)

const PLAIN_ACTION = cn(
  'inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill',
  'border border-border bg-surface-1/90 shadow-raised backdrop-blur-sm',
  'transition-colors duration-instant ease-out',
  'hover:bg-accent-surface hover:text-accent-surface-foreground',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'disabled:pointer-events-none disabled:opacity-50',
)

export function AvatarActions({
  hasAvatar,
  busy,
  visible,
  onUpload,
  onEdit,
  onRemove,
  onDownload,
}: {
  hasAvatar: boolean
  busy: boolean
  visible: boolean
  onUpload: () => void
  onEdit: () => void
  onRemove: () => void
  onDownload: () => void
}) {
  const { t } = useTranslation()
  const uploadLabel = hasAvatar ? t('profile.avatarReplace') : t('profile.avatarUpload')

  return (
    <fieldset
      aria-label={t('profile.avatarActions')}
      className={cn(
        'absolute inset-0 flex flex-wrap content-center items-center justify-center gap-2',
        'rounded-pill px-10',
        'motion-safe:transition-opacity motion-safe:duration-fast motion-safe:ease-out',
        visible
          ? 'bg-background/70 opacity-100'
          : cn(
              'opacity-0 hover:bg-background/70 focus-within:bg-background/70',
              'group-hover:bg-background/70 group-hover:opacity-100 focus-within:opacity-100',
            ),
        busy && 'pointer-events-none opacity-50',
      )}
    >
      <button
        type="button"
        disabled={busy}
        onClick={onUpload}
        title={uploadLabel}
        aria-label={uploadLabel}
        className={PLAIN_ACTION}
      >
        <Upload className="size-4" aria-hidden="true" />
      </button>

      {hasAvatar ? (
        <EditAction
          label={t('profile.avatarEdit')}
          disabled={busy}
          onClick={onEdit}
          className={ROUND_ACTION}
        />
      ) : null}

      {hasAvatar ? (
        <button
          type="button"
          disabled={busy}
          onClick={onDownload}
          title={t('profile.avatarDownload')}
          aria-label={t('profile.avatarDownload')}
          className={PLAIN_ACTION}
        >
          <Download className="size-4" aria-hidden="true" />
        </button>
      ) : null}

      {hasAvatar ? (
        <DeleteAction
          label={t('profile.avatarRemove')}
          disabled={busy}
          onClick={onRemove}
          className={ROUND_ACTION}
        />
      ) : null}
    </fieldset>
  )
}
