import { type Control, Controller, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { EVENT_FORMAT_KEY } from '@/entities/stage/stage.place'
import { cn } from '@/shared/styling/class-names/class-names'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { EVENT_FORMATS, type MeetupFormValues } from './event-form.schema'

export function EventPlaceFields({
  control,
  register,
  errors,
  format,
  side,
}: {
  control: Control<MeetupFormValues>
  register: UseFormRegister<MeetupFormValues>
  errors: FieldErrors<MeetupFormValues>
  format: MeetupFormValues['format']
  side?: React.ReactNode
}) {
  const { t } = useTranslation('event')
  const offline = format !== 'ONLINE'

  return (
    <div className="flex flex-col gap-4">
      <div className={cn('grid gap-4', side && 'sm:grid-cols-2')}>
        <Field
          label={t('form.format')}
          htmlFor="event-format"
          error={errors.format?.message}
          hint={t('form.formatHint')}
        >
          <Controller
            control={control}
            name="format"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="event-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_FORMATS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(EVENT_FORMAT_KEY[value])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {side}
      </div>

      {offline && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('form.country')}
            htmlFor="event-country"
            error={errors.country_code?.message}
            hint={t('form.countryHint')}
          >
            <Input
              id="event-country"
              maxLength={2}
              autoCapitalize="characters"
              {...register('country_code')}
            />
          </Field>
          <Field label={t('form.city')} htmlFor="event-city" error={errors.city?.message}>
            <Input id="event-city" {...register('city')} />
          </Field>
        </div>
      )}
    </div>
  )
}
