import { useTranslation } from 'react-i18next'
import { KeyCap, keyGlyph } from '@/shared/keyboard/key-cap'
import type { ShortcutPlatform } from '@/shared/keyboard/shortcut-bindings'
import type { CaptureDraft } from './use-capture'

export function DraftKeys({
  draft,
  platform,
}: {
  draft: CaptureDraft
  platform: ShortcutPlatform
}) {
  const { t } = useTranslation()

  if (draft.combo !== null) {
    return (
      <span data-shortcut-draft="combo" className="flex items-center gap-2">
        <KeyCap combo={draft.combo} platform={platform} />
      </span>
    )
  }

  if (draft.held.length > 0) {
    return (
      <span data-shortcut-draft="held" className="flex items-center gap-1">
        {draft.held.map((modifier) => (
          <kbd
            key={modifier}
            className="rounded-badge border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-caption"
          >
            {keyGlyph(modifier, platform)}
          </kbd>
        ))}
        <span className="text-caption text-muted-foreground">+</span>
      </span>
    )
  }

  return (
    <span data-shortcut-draft="empty" className="text-caption text-muted-foreground">
      {t('shortcuts.recording')}
    </span>
  )
}
