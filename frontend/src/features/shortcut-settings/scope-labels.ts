const SCOPE_KEY: Record<string, string> = {
  app: 'shortcuts.scopeApp',
  sidebar: 'shortcuts.scopeSidebar',
  search: 'shortcuts.scopeSearch',
  list: 'shortcuts.scopeList',
  'command-palette': 'shortcuts.scopePalette',
  'shortcut-help': 'shortcuts.scopeHelp',
}

export function scopeLabelKey(id: string): string {
  return SCOPE_KEY[id] ?? 'shortcuts.scopeOther'
}

export function isKnownScope(id: string): boolean {
  return id in SCOPE_KEY
}
