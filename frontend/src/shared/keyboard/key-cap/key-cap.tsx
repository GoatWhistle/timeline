import {
  ALT_GLYPH,
  detectPlatform,
  MOD_GLYPH,
  SHIFT_GLYPH,
  type ShortcutPlatform,
} from '../shortcut-bindings/platform'

const KEY_GLYPH: Record<string, string> = {
  arrowdown: '↓',
  arrowup: '↑',
  arrowleft: '←',
  arrowright: '→',
  escape: 'Esc',
  enter: 'Enter',
  space: 'Space',
  pageup: 'PgUp',
  pagedown: 'PgDn',
  backspace: 'Backspace',
  delete: 'Delete',
  home: 'Home',
  end: 'End',
  tab: 'Tab',
}

export function keyGlyph(step: string, platform: ShortcutPlatform): string {
  if (step === 'mod') return MOD_GLYPH[platform]
  if (step === 'alt') return ALT_GLYPH[platform]
  if (step === 'shift') return SHIFT_GLYPH[platform]
  return KEY_GLYPH[step] ?? step
}

export function keySteps(
  combo: string,
  platform: ShortcutPlatform = detectPlatform(),
): { id: string; label: string }[] {
  return combo
    .split(' ')
    .flatMap((step) => step.split('+'))
    .map((step, index) => ({
      id: `${combo}-${index}`,
      label: keyGlyph(step, platform),
    }))
}

export function KeyCap({ combo, platform }: { combo: string; platform?: ShortcutPlatform }) {
  return (
    <span className="flex items-center gap-1">
      {keySteps(combo, platform ?? detectPlatform()).map(({ id, label }) => (
        <kbd
          key={id}
          className="rounded-badge border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-caption"
        >
          {label}
        </kbd>
      ))}
    </span>
  )
}
