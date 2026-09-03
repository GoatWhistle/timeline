import { type Control, Controller, type FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/forms/field'
import { RangeSlider } from '@/shared/ui/forms/range-slider/range-slider'
import { type HackathonFormValues, TEAM_SIZE_MAX, TEAM_SIZE_MIN } from './event-form.schema'

const TEAM_BOUNDS = { min: TEAM_SIZE_MIN, max: TEAM_SIZE_MAX }

export function EventTeamSizeField({
  control,
  errors,
}: {
  control: Control<HackathonFormValues>
  errors: FieldErrors<HackathonFormValues>
}) {
  const { t } = useTranslation('event')

  return (
    <Controller
      control={control}
      name="team_size_min"
      render={({ field: low }) => (
        <Controller
          control={control}
          name="team_size_max"
          render={({ field: high }) => (
            <Field
              label={t('form.teamSize')}
              htmlFor="event-team-size-min"
              error={errors.team_size_min?.message ?? errors.team_size_max?.message}
            >
              <RangeSlider
                id="event-team-size"
                bounds={TEAM_BOUNDS}
                value={{ low: low.value, high: high.value }}
                lowLabel={t('form.teamSizeMin')}
                highLabel={t('form.teamSizeMax')}
                ticks
                valueText={(amount) => String(amount)}
                onChange={(next) => {
                  low.onChange(next.low)
                  high.onChange(next.high)
                }}
              />
            </Field>
          )}
        />
      )}
    />
  )
}
