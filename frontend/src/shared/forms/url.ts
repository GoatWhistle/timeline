const BROWSER_SCHEMES = new Set(['http:', 'https:'])

const ALLOWED_SCHEMES = new Set([
  'http:',
  'https:',
  'ftp:',
  'ftps:',
  'tg:',
  'matrix:',
  'webcal:',
  'irc:',
  'ircs:',
  'xmpp:',
])

const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:/i
const DEFAULT_SCHEME = 'https://'

function parseWithDefaultScheme(raw: string): { parsed: URL; schemeless: boolean } | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  const schemeless = !SCHEME_PREFIX.test(trimmed)
  if (schemeless && (trimmed.startsWith('/') || !trimmed.includes('.'))) return null

  let parsed: URL
  try {
    parsed = new URL(schemeless ? `${DEFAULT_SCHEME}${trimmed}` : trimmed)
  } catch {
    return null
  }
  if (parsed.hostname === '') return null
  if (schemeless && !parsed.hostname.includes('.')) return null
  return { parsed, schemeless }
}

function normalizeWithin(raw: string, schemes: Set<string>): string | null {
  const result = parseWithDefaultScheme(raw)
  if (result === null) return null
  if (!schemes.has(result.parsed.protocol)) return null
  return result.schemeless ? result.parsed.href : raw.trim()
}

export function normalizeFormUrl(raw: string): string | null {
  return normalizeWithin(raw, BROWSER_SCHEMES)
}

export function isAcceptedUrl(value: string): boolean {
  return normalizeFormUrl(value) !== null
}

export function normalizeLinkableUrl(raw: string): string | null {
  return normalizeWithin(raw, ALLOWED_SCHEMES)
}

export function isLinkableUrl(value: string): boolean {
  return normalizeLinkableUrl(value) !== null
}
