import { Check, RotateCcw } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyCap } from '@/shared/keyboard/key-cap'
import type { BindingRejection, ShortcutPlatform } from '@/shared/keyboard/shortcut-bindings'
import type { ShortcutDefinition } from '@/shared/keyboard/shortcut-registry'
import { Button } from '@/shared/ui/primitives/button'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import { EditAction } from '@/shared/ui/primitives/row-actions'
import { DraftKeys } from './draft-keys'
import { useCaptureKeys } from './use-capture'

export type RowProps = {
  shortcut: ShortcutDefinition
  platform: ShortcutPlatform
  overridden: boolean
  rejection: BindingRejection | null
  busy: boolean
  recording: boolean
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
  recording,
  onAssign,
  onReset,
  onRecording,
}: RowProps) {
  const { t } = useTranslation()

  const stop = useCallback(() => onRecording(null), [onRecording])
  const { draft, clear } = useCaptureKeys(recording, stop)

  const name = t(shortcut.titleKey)

  return (
    <div className="flex h-row items-center justify-between gap-4 border-border/60 border-b last:border-b-0">
      <dt className="min-w-0 truncate text-copy">
        {name}
        {rejection ? (
          <span role="alert" className="ml-2 text-caption text-destructive">
            {rejectionText(rejection, t)}
          </span>
        ) : null}
      </dt>
      <dd className="flex shrink-0 items-center gap-2">
        {recording ? (
          <DraftKeys draft={draft} platform={platform} />
        ) : (
          shortcut.keys.map((combo) => <KeyCap key={combo} combo={combo} platform={platform} />)
        )}
        {recording ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={busy || draft.combo === null}
              aria-label={t('shortcuts.saveOne', { name })}
              title={t('shortcuts.saveOne', { name })}
              onClick={() => {
                if (draft.combo !== null) onAssign(shortcut.id, draft.combo)
              }}
            >
              <Check className="size-4" aria-hidden="true" />
            </Button>
            <CloseButton
              label={t('shortcuts.cancelOne', { name })}
              disabled={busy}
              onClick={stop}
            />
          </>
        ) : (
          <EditAction
            label={t('shortcuts.changeOne', { name })}
            disabled={busy}
            onClick={() => onRecording(shortcut.id)}
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          disabled={busy || (recording ? !overridden && draft.combo === null : !overridden)}
          aria-label={t('shortcuts.resetOne', { name })}
          title={t('shortcuts.resetOne', { name })}
          onClick={() => {
            clear()
            onReset(shortcut.id)
          }}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </Button>
      </dd>
    </div>
  )
}
