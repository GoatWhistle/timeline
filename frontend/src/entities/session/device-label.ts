import type { SessionResponse } from '@/shared/api/types.gen'

export type DeviceKind = 'mobile' | 'tablet' | 'desktop' | 'unknown'

export type BrowserName = 'Edge' | 'Opera' | 'Firefox' | 'Yandex' | 'Chrome' | 'Safari'

export type PlatformName = 'Windows' | 'iOS' | 'Android' | 'macOS' | 'ChromeOS' | 'Linux'

export type DeviceLabel = {
  kind: DeviceKind
  browser: BrowserName | null
  platform: PlatformName | null
}

const BROWSERS: [RegExp, BrowserName][] = [
  [/\bEdgA?\/|\bEdge\//i, 'Edge'],
  [/\bOPR\/|\bOpera\//i, 'Opera'],
  [/\bFirefox\/|\bFxiOS\//i, 'Firefox'],
  [/\bYaBrowser\//i, 'Yandex'],
  [/\bChrome\/|\bCriOS\//i, 'Chrome'],
  [/\bSafari\//i, 'Safari'],
]

const PLATFORMS: [RegExp, PlatformName][] = [
  [/\bWindows\b/i, 'Windows'],
  [/\b(iPhone|iPad|iPod)\b/i, 'iOS'],
  [/\bAndroid\b/i, 'Android'],
  [/\bMac OS X\b|\bMacintosh\b/i, 'macOS'],
  [/\bCrOS\b/i, 'ChromeOS'],
  [/\bLinux\b/i, 'Linux'],
]

function firstMatch<T extends string>(source: string, table: [RegExp, T][]): T | null {
  for (const [pattern, name] of table) {
    if (pattern.test(source)) return name
  }
  return null
}

export function deviceKind(userAgent: string | null | undefined): DeviceKind {
  const source = (userAgent ?? '').trim()
  if (!source) return 'unknown'
  if (/\biPad\b|\bTablet\b/i.test(source)) return 'tablet'
  if (/\bAndroid\b/i.test(source) && !/\bMobile\b/i.test(source)) return 'tablet'
  if (/\bMobi\b|\bMobile\b|\biPhone\b|\biPod\b/i.test(source)) return 'mobile'
  return 'desktop'
}

export function describeDevice(userAgent: string | null | undefined): DeviceLabel {
  const source = (userAgent ?? '').trim()
  return {
    kind: deviceKind(source),
    browser: source ? firstMatch(source, BROWSERS) : null,
    platform: source ? firstMatch(source, PLATFORMS) : null,
  }
}

export function sortSessions(items: SessionResponse[]): SessionResponse[] {
  return [...items].sort((a, b) => {
    if (a.current === true && b.current !== true) return -1
    if (b.current === true && a.current !== true) return 1
    return (b.last_used_at ?? '').localeCompare(a.last_used_at ?? '')
  })
}
