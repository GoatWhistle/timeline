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
