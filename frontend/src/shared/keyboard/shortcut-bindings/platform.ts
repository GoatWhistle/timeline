export type ShortcutPlatform = 'mac' | 'other'

export type PlatformSource = {
  platform?: string
  userAgent?: string
  userAgentData?: { platform?: string }
}

export function detectPlatform(navigatorLike?: PlatformSource): ShortcutPlatform {
  const source: PlatformSource | undefined =
    navigatorLike ?? (typeof navigator === 'undefined' ? undefined : navigator)
  if (!source) return 'other'
  const hint = source.userAgentData?.platform || source.platform || source.userAgent || ''
  return /mac|iphone|ipad|ipod/i.test(hint) ? 'mac' : 'other'
}

export const MOD_GLYPH: Record<ShortcutPlatform, string> = { mac: '⌘', other: 'Ctrl' }

export const ALT_GLYPH: Record<ShortcutPlatform, string> = { mac: '⌥', other: 'Alt' }

export const SHIFT_GLYPH: Record<ShortcutPlatform, string> = { mac: '⇧', other: 'Shift' }
