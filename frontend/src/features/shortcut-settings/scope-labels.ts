const GLOBAL_SCOPES = new Set(['app', 'sidebar'])

export function isGlobalScope(id: string): boolean {
  return GLOBAL_SCOPES.has(id)
}
