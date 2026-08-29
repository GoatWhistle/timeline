import {
  Circle,
  ClipboardList,
  Filter,
  Flag,
  Presentation,
  Trophy,
  Upload,
  Users,
} from 'lucide-react'
import type * as React from 'react'
import type { StageType } from '@/shared/api/types.gen'

export const STAGE_TYPE_KEY: Record<StageType, string> = {
  REGISTRATION: 'event:stageType.REGISTRATION',
  SELECTION: 'event:stageType.SELECTION',
  PARTICIPATION: 'event:stageType.PARTICIPATION',
  CHECKPOINT: 'event:stageType.CHECKPOINT',
  SUBMISSION: 'event:stageType.SUBMISSION',
  DEMO: 'event:stageType.DEMO',
  RESULTS: 'event:stageType.RESULTS',
  OTHER: 'event:stageType.OTHER',
}

export const STAGE_TYPE_COLOR: Record<StageType, string> = {
  REGISTRATION: 'bg-stage-registration',
  SELECTION: 'bg-stage-selection',
  PARTICIPATION: 'bg-stage-participation',
  CHECKPOINT: 'bg-stage-checkpoint',
  SUBMISSION: 'bg-stage-submission',
  DEMO: 'bg-stage-demo',
  RESULTS: 'bg-stage-results',
  OTHER: 'bg-stage-other',
}

export const STAGE_TYPE_TEXT: Record<StageType, string> = {
  REGISTRATION: 'text-stage-registration',
  SELECTION: 'text-stage-selection',
  PARTICIPATION: 'text-stage-participation',
  CHECKPOINT: 'text-stage-checkpoint',
  SUBMISSION: 'text-stage-submission',
  DEMO: 'text-stage-demo',
  RESULTS: 'text-stage-results',
  OTHER: 'text-stage-other',
}

export const STAGE_TYPE_ICON: Record<StageType, React.ComponentType<{ className?: string }>> = {
  REGISTRATION: ClipboardList,
  SELECTION: Filter,
  PARTICIPATION: Users,
  CHECKPOINT: Flag,
  SUBMISSION: Upload,
  DEMO: Presentation,
  RESULTS: Trophy,
  OTHER: Circle,
}

export const STAGE_TYPE_PATTERNED: Record<StageType, boolean> = {
  REGISTRATION: false,
  SELECTION: false,
  PARTICIPATION: false,
  CHECKPOINT: false,
  SUBMISSION: false,
  DEMO: true,
  RESULTS: true,
  OTHER: false,
}

export const STAGE_TYPES = Object.keys(STAGE_TYPE_KEY) as StageType[]
