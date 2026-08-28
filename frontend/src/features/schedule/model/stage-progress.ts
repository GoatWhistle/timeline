import type { ScheduleItem } from '@/shared/api/types.gen'

export type StepState = 'past' | 'current' | 'future'

export type ProgressStep = {
  id: string
  name: string
  state: StepState
  stage: ScheduleItem
}

export type StageProgress = {
  steps: ProgressStep[]
  currentIndex: number
  total: number
}

export function stageProgress(
  stages: readonly ScheduleItem[],
  now: Date = new Date(),
): StageProgress {
  const ordered = [...stages].sort(
    (a, b) =>
      new Date(a.start_at).getTime() - new Date(b.start_at).getTime() || a.id.localeCompare(b.id),
  )
  const reference = now.getTime()

  let currentIndex = -1
  for (const [index, stage] of ordered.entries()) {
    const start = new Date(stage.start_at).getTime()
    const end = new Date(stage.end_at).getTime()
    if (start <= reference && reference <= end) {
      currentIndex = index
      break
    }
  }

  if (currentIndex === -1) {
    const next = ordered.findIndex((stage) => new Date(stage.start_at).getTime() > reference)
    currentIndex = next === -1 ? ordered.length - 1 : next
  }

  const steps = ordered.map((stage, index) => ({
    id: stage.id,
    name: stage.name,
    stage,
    state: stepState(index, currentIndex),
  }))

  return { steps, currentIndex, total: ordered.length }
}

function stepState(index: number, currentIndex: number): StepState {
  if (index < currentIndex) return 'past'
  if (index === currentIndex) return 'current'
  return 'future'
}
