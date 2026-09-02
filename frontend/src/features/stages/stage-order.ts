import type { StageResponse } from '@/shared/api/types.gen'

export type OrderChange = { id: string; sort_order: number }

export function sortedStages(stages: StageResponse[]): StageResponse[] {
  return [...stages].sort((left, right) => {
    if (left.sort_order !== right.sort_order) return left.sort_order - right.sort_order
    return Date.parse(left.start_at) - Date.parse(right.start_at)
  })
}

export function moveStage(stages: StageResponse[], id: string, direction: -1 | 1): OrderChange[] {
  const ordered = sortedStages(stages)
  const index = ordered.findIndex((stage) => stage.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= ordered.length) return []

  const reordered = [...ordered]
  const moved = reordered[index]
  const displaced = reordered[target]
  if (!moved || !displaced) return []
  reordered[index] = displaced
  reordered[target] = moved

  const changes: OrderChange[] = []
  reordered.forEach((stage, position) => {
    if (stage.sort_order !== position) changes.push({ id: stage.id, sort_order: position })
  })
  return changes
}

export function canMove(stages: StageResponse[], id: string, direction: -1 | 1): boolean {
  const ordered = sortedStages(stages)
  const index = ordered.findIndex((stage) => stage.id === id)
  if (index < 0) return false
  const target = index + direction
  return target >= 0 && target < ordered.length
}
