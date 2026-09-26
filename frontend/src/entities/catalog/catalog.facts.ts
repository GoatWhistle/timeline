export type TeamSizeLabel = {
  key: string
  values: Record<string, number>
}

export function teamSizeLabelKey(event: {
  team_size_min?: number
  team_size_max?: number
}): TeamSizeLabel | null {
  const min = event.team_size_min
  const max = event.team_size_max
  if (min !== undefined && max !== undefined) {
    if (min === max) return { key: 'catalog.card.teamExact', values: { size: min } }
    return { key: 'catalog.card.teamRange', values: { min, max } }
  }
  if (max !== undefined) return { key: 'catalog.card.teamUpTo', values: { max } }
  if (min !== undefined) return { key: 'catalog.card.teamFrom', values: { min } }
  return null
}

const DAY_MS = 24 * 60 * 60 * 1000

export function durationDays(startIso: string, endIso: string): number {
  const span = Date.parse(endIso) - Date.parse(startIso)
  if (!Number.isFinite(span) || span <= 0) return 1
  return Math.max(1, Math.ceil(span / DAY_MS))
}
