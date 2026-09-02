import { CircleEllipsis, GitBranch, MonitorPlay, Presentation, Send, Video } from 'lucide-react'
import type * as React from 'react'
import type { ArtifactKind } from '@/shared/api/types.gen'

export const ARTIFACT_KINDS: ArtifactKind[] = [
  'REPOSITORY',
  'VIDEO',
  'SLIDES',
  'DEMO',
  'SUBMISSION',
  'OTHER',
]

export const ARTIFACT_KIND_KEY: Record<ArtifactKind, string> = {
  REPOSITORY: 'event:personal.artifactKind.REPOSITORY',
  VIDEO: 'event:personal.artifactKind.VIDEO',
  SLIDES: 'event:personal.artifactKind.SLIDES',
  DEMO: 'event:personal.artifactKind.DEMO',
  SUBMISSION: 'event:personal.artifactKind.SUBMISSION',
  OTHER: 'event:personal.artifactKind.OTHER',
}

export const ARTIFACT_KIND_ICON: Record<
  ArtifactKind,
  React.ComponentType<{ className?: string }>
> = {
  REPOSITORY: GitBranch,
  VIDEO: Video,
  SLIDES: Presentation,
  DEMO: MonitorPlay,
  SUBMISSION: Send,
  OTHER: CircleEllipsis,
}

export const TEMPLATE_KEY_PREFIX = 'event:personal.template'

export function templateNameKey(templateId: string): string {
  return `${TEMPLATE_KEY_PREFIX}.name.${templateId}`
}

export function templateItemKey(titleKey: string): string {
  return `${TEMPLATE_KEY_PREFIX}.item.${titleKey}`
}
