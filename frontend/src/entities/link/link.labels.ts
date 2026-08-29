import {
  BookOpenText,
  CircleEllipsis,
  Database,
  FileCode2,
  Gavel,
  Globe,
  Handshake,
  MessagesSquare,
  Trophy,
  Upload,
  UserRoundCheck,
  UserRoundPlus,
} from 'lucide-react'
import type * as React from 'react'
import type { LinkKind } from '@/shared/api/types.gen'

export const LINK_KINDS: LinkKind[] = [
  'WEBSITE',
  'RULES',
  'REGISTRATION',
  'SUBMISSION',
  'CHAT',
  'DATASET',
  'API_DOCS',
  'JUDGING',
  'MENTORS',
  'RESULTS',
  'SPONSOR',
  'OTHER',
]

export const LINK_KIND_KEY: Record<LinkKind, string> = {
  WEBSITE: 'event:linkKind.WEBSITE',
  RULES: 'event:linkKind.RULES',
  REGISTRATION: 'event:linkKind.REGISTRATION',
  SUBMISSION: 'event:linkKind.SUBMISSION',
  CHAT: 'event:linkKind.CHAT',
  DATASET: 'event:linkKind.DATASET',
  API_DOCS: 'event:linkKind.API_DOCS',
  JUDGING: 'event:linkKind.JUDGING',
  MENTORS: 'event:linkKind.MENTORS',
  RESULTS: 'event:linkKind.RESULTS',
  SPONSOR: 'event:linkKind.SPONSOR',
  OTHER: 'event:linkKind.OTHER',
}

export const LINK_KIND_ICON: Record<LinkKind, React.ComponentType<{ className?: string }>> = {
  WEBSITE: Globe,
  RULES: BookOpenText,
  REGISTRATION: UserRoundPlus,
  SUBMISSION: Upload,
  CHAT: MessagesSquare,
  DATASET: Database,
  API_DOCS: FileCode2,
  JUDGING: Gavel,
  MENTORS: UserRoundCheck,
  RESULTS: Trophy,
  SPONSOR: Handshake,
  OTHER: CircleEllipsis,
}

export const LINK_KIND_COLOR: Record<LinkKind, string> = {
  WEBSITE: 'text-stage-registration',
  RULES: 'text-stage-selection',
  REGISTRATION: 'text-stage-registration',
  SUBMISSION: 'text-stage-submission',
  CHAT: 'text-stage-participation',
  DATASET: 'text-stage-checkpoint',
  API_DOCS: 'text-stage-checkpoint',
  JUDGING: 'text-stage-demo',
  MENTORS: 'text-stage-participation',
  RESULTS: 'text-stage-results',
  SPONSOR: 'text-stage-other',
  OTHER: 'text-stage-other',
}
