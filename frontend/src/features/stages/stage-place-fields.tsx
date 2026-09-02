import type { Control, FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { EVENT_FORMAT_KEY } from '@/entities/stage/stage.place'
import type { EventFormat } from '@/shared/api/types.gen'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'

export const STAGE_FORMATS: EventFormat[] = ['ONLINE', 'OFFLINE', 'HYBRID']
export const INHERIT = 'INHERIT'

export function StagePlaceFields<T extends FieldValues>({
  control,
  register,
  errors,
  format,
}: {
  control: Control<T>
  register: UseFormRegister<T>
  errors: FieldErrors<T>
  format: string
}) {
  const { t } = useTranslation('event')
  const offline = format === 'OFFLINE' || format === 'HYBRID'

  return (
    <>
      <Field
        label={t('place.formFormat')}
        htmlFor="stage-format"
        error={errors.format?.message as string | undefined}
      >
        <Controller
          control={control}
          name={'format' as Path<T>}
          render={({ field }) => (
            <Select value={String(field.value)} onValueChange={field.onChange}>
              <SelectTrigger id="stage-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={INHERIT}>{t('place.formFormatInherit')}</SelectItem>
                {STAGE_FORMATS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(EVENT_FORMAT_KEY[value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {offline && (
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={t('place.formCountry')}
            htmlFor="stage-country"
            error={errors.country_code?.message as string | undefined}
          >
            <Input id="stage-country" maxLength={2} {...register('country_code' as Path<T>)} />
          </Field>
          <Field
            label={t('place.formCity')}
            htmlFor="stage-city"
            error={errors.city?.message as string | undefined}
          >
            <Input id="stage-city" {...register('city' as Path<T>)} />
          </Field>
        </div>
      )}

      <Field
        label={t('place.formVenue')}
        htmlFor="stage-venue"
        error={errors.venue?.message as string | undefined}
      >
        <Input id="stage-venue" {...register('venue' as Path<T>)} />
      </Field>

      <Field
        label={t('place.formOnlineUrl')}
        htmlFor="stage-online-url"
        error={errors.online_url?.message as string | undefined}
      >
        <Input id="stage-online-url" {...register('online_url' as Path<T>)} />
      </Field>
    </>
  )
}
