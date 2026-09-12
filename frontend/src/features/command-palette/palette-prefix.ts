export type PaletteMode =
  | 'hackathons'
  | 'meetups'
  | 'events'
  | 'commands'
  | 'pages'
  | 'teams'
  | 'admin'
  | 'smart'

export const PREFIX_MODE: Record<string, PaletteMode> = {
  '#': 'hackathons',
  '@': 'meetups',
  '*': 'events',
  '>': 'commands',
  '/': 'pages',
  '~': 'teams',
  '!': 'admin',
}

export type ParsedQuery = {
  mode: PaletteMode
  prefix: string | null
  term: string
}

export function parseQuery(raw: string): ParsedQuery {
  const first = raw.slice(0, 1)
  const mode = PREFIX_MODE[first]
  if (mode === undefined) return { mode: 'smart', prefix: null, term: raw.trim() }
  return { mode, prefix: first, term: raw.slice(1).trim() }
}

export function isHelpQuery(raw: string): boolean {
  return raw.trim() === '?'
}
