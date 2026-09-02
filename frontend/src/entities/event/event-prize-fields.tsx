import { type Control, Controller, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { RangeSlider } from '@/shared/ui/forms/range-slider/range-slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { CURRENCIES } from './event-currency'
import { type HackathonFormValues, TEAM_SIZE_MAX, TEAM_SIZE_MIN } from './event-form.schema'

const TEAM_BOUNDS = { min: TEAM_SIZE_MIN, max: TEAM_SIZE_MAX }

export function EventPrizeFields({
  control,
  register,
  errors,
}: {
  control: Control<HackathonFormValues>
  register: UseFormRegister<HackathonFormValues>
  errors: FieldErrors<HackathonFormValues>
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
          <Controller
            control={control}
            name="prize_currency"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="event-prize-currency">
                  <SelectValue placeholder={t('form.prizeCurrencyPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(({ code, symbol }) => (
                    <SelectItem key={code} value={code}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 text-center tabular-nums">{symbol}</span>
                        <span className="font-mono">{code}</span>
                        <span className="text-muted-foreground">{t(`form.currency.${code}`)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

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
                hint={t('form.teamSizeHint', { min: TEAM_SIZE_MIN, max: TEAM_SIZE_MAX })}
              >
                <RangeSlider
                  id="event-team-size"
                  bounds={TEAM_BOUNDS}
                  value={{ low: low.value, high: high.value }}
                  lowLabel={t('form.teamSizeMin')}
                  highLabel={t('form.teamSizeMax')}
                  summary={t('form.teamSizeSummary', {
                    min: low.value,
                    max: high.value,
                    count: high.value,
                  })}
                  valueText={(amount) => t('form.teamSizeValue', { count: amount })}
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
    </div>
  )
}
