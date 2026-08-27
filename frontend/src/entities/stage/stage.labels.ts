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

export const STAGE_TYPE_LABEL: Record<StageType, string> = {
  REGISTRATION: 'Регистрация',
  SELECTION: 'Отбор',
  PARTICIPATION: 'Участие',
  CHECKPOINT: 'Контрольная точка',
  SUBMISSION: 'Сдача решения',
  DEMO: 'Демонстрация',
  RESULTS: 'Результаты',
  OTHER: 'Другое',
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

export const STAGE_TYPES = Object.keys(STAGE_TYPE_LABEL) as StageType[]
