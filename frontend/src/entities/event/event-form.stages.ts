import { useCallback, useState } from 'react'
import type { EventKind } from '@/shared/api/types.gen'
import type { HackathonFormValues } from './event-form.schema'

export type StageId = 'kind' | 'basics' | 'period' | 'place' | 'prize'

export type StageDefinition = {
  id: StageId
  labelKey: string
  fields: readonly (keyof HackathonFormValues)[]
}

const KIND: StageDefinition = { id: 'kind', labelKey: 'stage.kind', fields: [] }

const BASICS: StageDefinition = {
  id: 'basics',
  labelKey: 'stage.basics',
  fields: ['title', 'organizer', 'origin', 'website_url', 'description'],
}

const PERIOD: StageDefinition = { id: 'period', labelKey: 'stage.period', fields: [] }

const PLACE: StageDefinition = {
  id: 'place',
  labelKey: 'stage.place',
  fields: ['format', 'country_code', 'city'],
}

const PRIZE: StageDefinition = {
  id: 'prize',
  labelKey: 'stage.prize',
  fields: ['prize_pool', 'prize_currency', 'team_size_min', 'team_size_max'],
}

const MEETUP_STAGES: StageDefinition[] = [KIND, BASICS, PERIOD, PLACE]
const HACKATHON_STAGES: StageDefinition[] = [KIND, BASICS, PERIOD, PLACE, PRIZE]

export function stagesOf(kind: EventKind): StageDefinition[] {
  return kind === 'MEETUP' ? MEETUP_STAGES : HACKATHON_STAGES
}

export function stageIndex(stages: StageDefinition[], id: StageId): number {
  const found = stages.findIndex((stage) => stage.id === id)
  return found === -1 ? 0 : found
}

export function stageOfFields(stages: StageDefinition[], named: string[]): StageId | null {
  for (const stage of stages) {
    if (stage.fields.some((field) => named.includes(field))) return stage.id
  }
  return null
}

export type StagePipeline = {
  stages: StageDefinition[]
  stage: StageDefinition
  index: number
  reached: number
  goTo: (id: StageId) => void
  markDone: () => void
  retreat: () => void
}

export function useStagePipeline(kind: EventKind, opened: boolean): StagePipeline {
  const stages = stagesOf(kind)
  const [current, setCurrent] = useState<StageId>(opened ? 'basics' : 'kind')
  const [reached, setReached] = useState(opened ? HACKATHON_STAGES.length : 0)

  const index = stageIndex(stages, current)

  const goTo = useCallback((id: StageId) => setCurrent(id), [])

  const markDone = useCallback(() => {
    setReached((seen) => Math.max(seen, index + 1))
    const next = stages[index + 1]
    if (next) setCurrent(next.id)
  }, [index, stages])

  const retreat = useCallback(() => {
    const previous = stages[index - 1]
    if (previous) setCurrent(previous.id)
  }, [index, stages])

  return {
    stages,
    stage: stages[index] ?? KIND,
    index,
    reached,
    goTo,
    markDone,
    retreat,
  }
}
