import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import type { EventFormValues } from './event-form.schema'

export function EventPrizeFields({
  register,
  errors,
}: {
  register: UseFormRegister<EventFormValues>
  errors: FieldErrors<EventFormValues>
}) {
  const { t } = useTranslation('event')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('form.prizePool')}
          htmlFor="event-prize-pool"
          error={errors.prize_pool?.message}
          hint={t('form.prizePairHint')}
        >
          <Input id="event-prize-pool" inputMode="decimal" {...register('prize_pool')} />
        </Field>
        <Field
          label={t('form.prizeCurrency')}
          htmlFor="event-prize-currency"
          error={errors.prize_currency?.message}
        >
          <Input
            id="event-prize-currency"
            maxLength={3}
            autoCapitalize="characters"
            {...register('prize_currency')}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('form.teamSizeMin')}
          htmlFor="event-team-min"
          error={errors.team_size_min?.message}
          hint={t('form.teamSizeHint')}
        >
          <Input
            id="event-team-min"
            inputMode="numeric"
            min={1}
            max={100}
            {...register('team_size_min')}
          />
        </Field>
        <Field
          label={t('form.teamSizeMax')}
          htmlFor="event-team-max"
          error={errors.team_size_max?.message}
        >
          <Input
            id="event-team-max"
            inputMode="numeric"
            min={1}
            max={100}
            {...register('team_size_max')}
          />
        </Field>
      </div>
    </div>
  )
}
