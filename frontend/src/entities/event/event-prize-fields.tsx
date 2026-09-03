import { type Control, Controller, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { CURRENCIES } from './event-currency'
import type { HackathonFormValues } from './event-form.schema'
import { EventTeamSizeField } from './event-team-size-field'

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
    <div className="flex flex-col gap-5">
      <Field label={t('form.track')} htmlFor="event-track" error={errors.track?.message}>
        <Input id="event-track" {...register('track')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('form.prizePool')}
          htmlFor="event-prize-pool"
          error={errors.prize_pool?.message}
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

      <EventTeamSizeField control={control} errors={errors} />
    </div>
  )
}
