import { useTranslation } from 'react-i18next'
import type { BindingRejection, ShortcutPlatform } from '@/shared/keyboard/shortcut-bindings'
import type { ShortcutDefinition } from '@/shared/keyboard/shortcut-registry'
import { ShortcutRow } from './shortcut-row'

export type SectionProps = {
  title: string
  shortcuts: ShortcutDefinition[]
  platform: ShortcutPlatform
  bindings: Record<string, string>
  rejected: { actionId: string; rejection: BindingRejection } | null
  recordingId: string | null
  busy: boolean
  emptyText?: string
  onAssign: (actionId: string, combo: string) => void
  onReset: (actionId: string) => void
  onRecording: (actionId: string | null) => void
}

export function ShortcutSection({
  title,
  shortcuts,
  platform,
  bindings,
  rejected,
  recordingId,
  busy,
  emptyText,
  onAssign,
  onReset,
  onRecording,
}: SectionProps) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-1">
      <h3 className="font-medium text-caption text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {shortcuts.length === 0 ? (
        <p className="text-caption text-muted-foreground">
          {emptyText ?? t('shortcuts.emptyHint')}
        </p>
      ) : (
        <dl className="flex flex-col">
          {shortcuts.map((shortcut) => (
            <ShortcutRow
              key={shortcut.id}
              shortcut={shortcut}
              platform={platform}
              overridden={bindings[shortcut.id] !== undefined}
              rejection={rejected?.actionId === shortcut.id ? rejected.rejection : null}
              busy={busy}
              recording={recordingId === shortcut.id}
              onAssign={onAssign}
              onReset={onReset}
              onRecording={onRecording}
            />
          ))}
        </dl>
      )}
    </section>
  )
}
