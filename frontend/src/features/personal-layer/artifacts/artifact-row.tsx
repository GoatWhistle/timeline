import { useTranslation } from 'react-i18next'
import { ARTIFACT_KIND_ICON, ARTIFACT_KIND_KEY } from '@/entities/personal/personal.labels'
import { filled } from '@/entities/personal/personal-fields'
import type { ParticipantArtifact } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Label } from '@/shared/ui/forms/label'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'

export function ArtifactRow({
  artifact,
  onToggle,
  onEdit,
  onRemove,
  busy,
}: {
  artifact: ParticipantArtifact
  onToggle: (submitted: boolean) => void
  onEdit: () => void
  onRemove: () => void
  busy: boolean
}) {
  const { t } = useTranslation('event')
  const Icon = ARTIFACT_KIND_ICON[artifact.kind]
  const kindLabel = t(ARTIFACT_KIND_KEY[artifact.kind])
  const name = filled(artifact.title) ? artifact.title : kindLabel
  const submitted = filled(artifact.submitted_at)

  return (
    <li className="flex items-start gap-3 rounded-control border border-border bg-card p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <ExternalLink className="text-primary hover:underline" href={artifact.url}>
          <span className="truncate">{name}</span>
        </ExternalLink>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-meta text-muted-foreground">
          <Badge tone="neutral">{kindLabel}</Badge>
          {submitted && (
            <span>
              {t('personal.artifacts.submittedAt', { date: formatDateTime(artifact.submitted_at) })}
            </span>
          )}
        </p>
        <div className="mt-2 flex items-center gap-2 text-meta text-muted-foreground">
          <Checkbox
            id={`artifact-submitted-${artifact.id}`}
            checked={submitted}
            disabled={busy}
            onCheckedChange={(next) => onToggle(next === true)}
          />
          <Label htmlFor={`artifact-submitted-${artifact.id}`} className="font-normal">
            {t('personal.artifacts.submitted')}
          </Label>
        </div>
      </div>

      <EditAction onClick={onEdit} label={t('personal.artifacts.edit', { title: name })} />
      <DeleteAction onClick={onRemove} label={t('personal.artifacts.remove', { title: name })} />
    </li>
  )
}
