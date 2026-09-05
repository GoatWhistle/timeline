import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ARTIFACT_KIND_KEY, ARTIFACT_KINDS } from '@/entities/personal/personal.labels'
import { textOf } from '@/entities/personal/personal-fields'
import type { ArtifactKind, ParticipantArtifact } from '@/shared/api/types.gen'
import { normalizeFormUrl } from '@/shared/forms/url'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Button } from '@/shared/ui/primitives/button'

export type ArtifactValues = {
  kind: ArtifactKind
  url: string
  title: string
}

export function artifactInitial(artifact: ParticipantArtifact | null): ArtifactValues {
  if (artifact === null) return { kind: 'REPOSITORY', url: '', title: '' }
  return { kind: artifact.kind, url: artifact.url, title: textOf(artifact.title) }
}

export function ArtifactForm({
  idPrefix,
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  idPrefix: string
  initial: ArtifactValues
  submitLabel: string
  pending: boolean
  onSubmit: (values: ArtifactValues & { url: string }) => void
  onCancel?: () => void
}) {
  const { t } = useTranslation('event')
  const [values, setValues] = useState<ArtifactValues>(initial)
  const [touched, setTouched] = useState(false)

  const normalized = normalizeFormUrl(values.url)
  const urlError = touched && normalized === null ? t('personal.artifacts.urlRequired') : undefined

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (normalized === null) return
    onSubmit({ ...values, url: normalized })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field label={t('personal.artifacts.kindLabel')} htmlFor={`${idPrefix}-kind`}>
        <Select
          value={values.kind}
          onValueChange={(kind) => setValues({ ...values, kind: kind as ArtifactKind })}
        >
          <SelectTrigger id={`${idPrefix}-kind`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ARTIFACT_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {t(ARTIFACT_KIND_KEY[kind])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label={t('personal.artifacts.urlLabel')}
        htmlFor={`${idPrefix}-url`}
        error={urlError}
        required
      >
        <Input
          id={`${idPrefix}-url`}
          value={values.url}
          maxLength={2048}
          inputMode="url"
          onChange={(event) => setValues({ ...values, url: event.target.value })}
        />
      </Field>

      <Field label={t('personal.artifacts.titleLabel')} htmlFor={`${idPrefix}-title`}>
        <Input
          id={`${idPrefix}-title`}
          value={values.title}
          maxLength={200}
          onChange={(event) => setValues({ ...values, title: event.target.value })}
        />
      </Field>

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common:action.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
