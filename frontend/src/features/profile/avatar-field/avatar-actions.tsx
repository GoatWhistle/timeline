import { Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'

const ACTION = cn(
  'inline-flex size-9 cursor-pointer items-center justify-center rounded-pill',
  'border border-border bg-surface-1 text-copy shadow-raised transition-colors',
  'duration-instant ease-out hover:bg-accent-surface hover:text-accent-surface-foreground',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
)

const ROUND_ACTION = 'size-9 rounded-pill border border-border bg-surface-1 shadow-raised'

export function AvatarActions({
  hasAvatar,
  busy,
  visible,
  onUpload,
  onEdit,
  onRemove,
}: {
  hasAvatar: boolean
  busy: boolean
  visible: boolean
  onUpload: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()

  return (
    <fieldset
      aria-label={t('profile.avatarActions')}
      className={cn(
        'absolute inset-x-0 bottom-0 flex justify-center gap-1.5',
        'motion-safe:transition-opacity motion-safe:duration-fast motion-safe:ease-out',
        visible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
        busy && 'pointer-events-none opacity-50',
      )}
    >
      {hasAvatar ? (
        <EditAction
          label={t('profile.avatarEdit')}
          disabled={busy}
          onClick={onEdit}
          className={ROUND_ACTION}
        />
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={onUpload}
        title={hasAvatar ? t('profile.avatarReplace') : t('profile.avatarUpload')}
        className={cn(ACTION, 'w-auto gap-1.5 px-3')}
      >
        <Upload className="size-4" aria-hidden="true" />
        {hasAvatar ? t('profile.avatarReplace') : t('profile.avatarUpload')}
      </button>

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
