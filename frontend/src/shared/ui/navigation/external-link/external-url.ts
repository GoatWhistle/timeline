const BROWSER_SCHEMES = new Set(['http:', 'https:'])

const RENDERABLE_SCHEMES = new Set([
  'http:',
  'https:',
  'ftp:',
  'ftps:',
  'mailto:',
  'tel:',
  'tg:',
  'matrix:',
  'webcal:',
  'irc:',
  'ircs:',
  'xmpp:',
])

export function parseExternalUrl(href: string): URL | null {
  const trimmed = href.trim()
  if (trimmed === '') return null
  try {
    return new URL(trimmed)
  } catch {
    return null
  }
}

export function isInsecureLink(href: string): boolean {
  const parsed = parseExternalUrl(href)
  if (!parsed) return false
  return parsed.protocol === 'http:'
}

export function isBrowserScheme(href: string): boolean {
  const parsed = parseExternalUrl(href)
  if (!parsed) return false
  return BROWSER_SCHEMES.has(parsed.protocol)
}

export function isRenderableLink(href: string): boolean {
  const parsed = parseExternalUrl(href)
  if (!parsed) return false
  return RENDERABLE_SCHEMES.has(parsed.protocol)
}

export function safeLinkHref(href: string): string | undefined {
  return isRenderableLink(href) ? href : undefined
}

export function linkHost(href: string): string | null {
  const parsed = parseExternalUrl(href)
  if (!parsed) return null
  return parsed.host === '' ? null : parsed.host
}
