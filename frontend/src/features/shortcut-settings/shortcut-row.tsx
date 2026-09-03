import { RotateCcw } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyCap } from '@/shared/keyboard/key-cap'
import type { BindingRejection, ShortcutPlatform } from '@/shared/keyboard/shortcut-bindings'
import type { ShortcutDefinition } from '@/shared/keyboard/shortcut-registry'
import { Button } from '@/shared/ui/primitives/button'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import { EditAction } from '@/shared/ui/primitives/row-actions'
import { useCaptureKeys } from './use-capture'

export type RowProps = {
  shortcut: ShortcutDefinition
  platform: ShortcutPlatform
  overridden: boolean
  rejection: BindingRejection | null
  busy: boolean
  onAssign: (actionId: string, combo: string) => void
  onReset: (actionId: string) => void
  onRecording: (actionId: string | null) => void
}

type Translate = ReturnType<typeof useTranslation>['t']

function rejectionText(rejection: BindingRejection, t: Translate): string {
  if (rejection.kind === 'invalid') return t('shortcuts.rejectInvalid')
  if (rejection.kind === 'reserved') return t(rejection.reasonKey)
  return t('shortcuts.rejectConflict', { action: t(rejection.titleKey) })
}

export function ShortcutRow({
  shortcut,
  platform,
  overridden,
  rejection,
  busy,
  onAssign,
  onReset,
  onRecording,
}: RowProps) {
  const { t } = useTranslation()
  const [recording, setRecording] = useState(false)

  const stop = useCallback(() => {
    setRecording(false)
    onRecording(null)
  }, [onRecording])

  const onCombo = useCallback(
    (combo: string) => {
      if (combo === '') {
        stop()
        return
      }
      onAssign(shortcut.id, combo)
    },
    [onAssign, shortcut.id, stop],
  )

  const { pending } = useCaptureKeys(recording, onCombo)

  return (
    <div className="flex h-row items-center justify-between gap-4 border-border/60 border-b last:border-b-0">
      <dt className="min-w-0 truncate text-copy">
        {t(shortcut.titleKey)}
        {rejection ? (
          <span role="alert" className="ml-2 text-caption text-destructive">
            {rejectionText(rejection, t)}
          </span>
        ) : null}
      </dt>
      <dd className="flex shrink-0 items-center gap-2">
        {recording ? (
          <span className="text-caption text-muted-foreground">
            {pending === null
              ? t('shortcuts.recording')
              : t('shortcuts.recordingChord', { key: pending })}
          </span>
        ) : (
          shortcut.keys.map((combo) => <KeyCap key={combo} combo={combo} platform={platform} />)
        )}
        {recording ? (
          <CloseButton label={t('shortcuts.cancel')} disabled={busy} onClick={stop} />
        ) : (
          <EditAction
            label={t('shortcuts.changeOne', { name: t(shortcut.titleKey) })}
            disabled={busy}
            onClick={() => {
              setRecording(true)
              onRecording(shortcut.id)
            }}
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          disabled={busy || !overridden}
          aria-label={t('shortcuts.resetOne')}
          onClick={() => onReset(shortcut.id)}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </Button>
      </dd>
    </div>
  )
}
