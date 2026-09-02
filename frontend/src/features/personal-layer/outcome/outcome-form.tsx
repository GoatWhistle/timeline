import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { allowsPlace, OUTCOME_KEY, OUTCOMES } from '@/entities/personal/outcome.queries'
import { countOf, textOf } from '@/entities/personal/personal-fields'
import type { Outcome, ParticipantOutcome, SaveOutcomeRequest } from '@/shared/api/types.gen'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Textarea } from '@/shared/ui/forms/textarea'
import { Button } from '@/shared/ui/primitives/button'

export type OutcomeValues = {
  outcome: Outcome
  place: string
  prize: string
  track: string
  note: string
}

export function outcomeInitial(outcome: ParticipantOutcome | null): OutcomeValues {
  if (outcome === null) {
    return { outcome: 'PARTICIPATED', place: '', prize: '', track: '', note: '' }
  }
  return {
    outcome: outcome.outcome,
    place: countOf(outcome.place) === 0 ? '' : String(outcome.place),
    prize: textOf(outcome.prize),
    track: textOf(outcome.track),
    note: textOf(outcome.note),
  }
}

export function toRequest(values: OutcomeValues): SaveOutcomeRequest {
  const place = Number.parseInt(values.place, 10)
  const keepsPlace = allowsPlace(values.outcome) && Number.isFinite(place) && place > 0
  return {
    outcome: values.outcome,
    ...(keepsPlace ? { place } : {}),
    ...(values.prize.trim() === '' ? {} : { prize: values.prize.trim() }),
    ...(values.track.trim() === '' ? {} : { track: values.track.trim() }),
    ...(values.note.trim() === '' ? {} : { note: values.note.trim() }),
  }
}

export function OutcomeForm({
  initial,
  pending,
  onSubmit,
}: {
  initial: OutcomeValues
  pending: boolean
  onSubmit: (values: OutcomeValues) => void
}) {
  const { t } = useTranslation('event')
  const [values, setValues] = useState<OutcomeValues>(initial)

  const placeAllowed = allowsPlace(values.outcome)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  function chooseOutcome(next: Outcome) {
    setValues({ ...values, outcome: next, place: allowsPlace(next) ? values.place : '' })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field label={t('personal.outcome.label')} htmlFor="personal-outcome">
        <Select value={values.outcome} onValueChange={(next) => chooseOutcome(next as Outcome)}>
          <SelectTrigger id="personal-outcome">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTCOMES.map((outcome) => (
              <SelectItem key={outcome} value={outcome}>
                {t(OUTCOME_KEY[outcome])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {placeAllowed && (
        <Field
          label={t('personal.outcome.placeLabel')}
          htmlFor="personal-place"
          hint={t('personal.outcome.placeHint')}
        >
          <Input
            id="personal-place"
            type="number"
            min={1}
            inputMode="numeric"
            value={values.place}
            onChange={(event) => setValues({ ...values, place: event.target.value })}
          />
        </Field>
      )}

      <Field label={t('personal.outcome.prizeLabel')} htmlFor="personal-prize">
        <Input
          id="personal-prize"
          value={values.prize}
          maxLength={200}
          onChange={(event) => setValues({ ...values, prize: event.target.value })}
        />
      </Field>

      <Field label={t('personal.outcome.trackLabel')} htmlFor="personal-track">
        <Input
          id="personal-track"
          value={values.track}
          maxLength={200}
          onChange={(event) => setValues({ ...values, track: event.target.value })}
        />
      </Field>

      <Field label={t('personal.outcome.noteLabel')} htmlFor="personal-outcome-note">
        <Textarea
          id="personal-outcome-note"
          rows={3}
          value={values.note}
          onChange={(event) => setValues({ ...values, note: event.target.value })}
        />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {t('common:action.save')}
        </Button>
      </div>
    </form>
  )
}
