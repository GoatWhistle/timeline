import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import type {
  RetentionSettingsResponse,
  UpdateRetentionSettingsRequest,
} from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Switch } from '@/shared/ui/forms/switch'
import { Button } from '@/shared/ui/primitives/button'

const OPTIONAL_INT = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d+$/.test(value), 'retention.mustBeWhole')

const schema = z.object({
  archive_after_days: OPTIONAL_INT,
  delete_archive_after_months: OPTIONAL_INT,
  delete_covers_on_archive: z.boolean(),
  audit_log_retention_days: z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), 'retention.mustBeWhole'),
})

type FormValues = z.input<typeof schema>

function toField(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

export function RetentionSettingsForm({
  settings,
  onSubmit,
}: {
  settings: RetentionSettingsResponse
  onSubmit: (payload: UpdateRetentionSettingsRequest) => Promise<void>
}) {
  const { t } = useTranslation()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      archive_after_days: toField(settings.archive_after_days),
      delete_archive_after_months: toField(settings.delete_archive_after_months),
      delete_covers_on_archive: settings.delete_covers_on_archive,
      audit_log_retention_days: String(settings.audit_log_retention_days),
    },
  })

  async function submit(values: FormValues) {
    try {
      await onSubmit({
        archive_after_days:
          values.archive_after_days === '' ? undefined : Number(values.archive_after_days),
        delete_archive_after_months:
          values.delete_archive_after_months === ''
            ? undefined
            : Number(values.delete_archive_after_months),
        delete_covers_on_archive: values.delete_covers_on_archive,
        audit_log_retention_days: Number(values.audit_log_retention_days),
      })
    } catch (error) {
      applyServerErrors(error, setError, [
        'archive_after_days',
        'delete_archive_after_months',
        'audit_log_retention_days',
      ])
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
      <Field
        label={t('retention.archiveAfterDays')}
        htmlFor="retention-archive-after-days"
        hint={t('retention.archiveAfterDaysHint')}
        error={
          errors.archive_after_days?.message ? t(errors.archive_after_days.message) : undefined
        }
      >
        <Input
          id="retention-archive-after-days"
          inputMode="numeric"
          placeholder={t('retention.disabled')}
          {...register('archive_after_days')}
        />
      </Field>

      <Field
        label={t('retention.deleteArchiveAfterMonths')}
        htmlFor="retention-delete-archive-after-months"
        hint={t('retention.deleteArchiveAfterMonthsHint')}
        error={
          errors.delete_archive_after_months?.message
            ? t(errors.delete_archive_after_months.message)
            : undefined
        }
      >
        <Input
          id="retention-delete-archive-after-months"
          inputMode="numeric"
          placeholder={t('retention.forever')}
          {...register('delete_archive_after_months')}
        />
      </Field>

      <Controller
        control={control}
        name="delete_covers_on_archive"
        render={({ field }) => (
          <label
            htmlFor="retention-delete-covers"
            className="flex cursor-pointer items-center justify-between gap-4 rounded-control border border-border p-3"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-copy">{t('retention.deleteCoversOnArchive')}</span>
              <span className="text-meta text-muted-foreground">
                {t('retention.deleteCoversOnArchiveHint')}
              </span>
            </span>
            <Switch
              id="retention-delete-covers"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </label>
        )}
      />

      <Field
        label={t('retention.auditLogRetentionDays')}
        htmlFor="retention-audit-log-retention-days"
        hint={t('retention.auditLogRetentionDaysHint')}
        error={
          errors.audit_log_retention_days?.message
            ? t(errors.audit_log_retention_days.message)
            : undefined
        }
      >
        <Input
          id="retention-audit-log-retention-days"
          inputMode="numeric"
          {...register('audit_log_retention_days')}
        />
      </Field>

      {errors.root && (
        <p role="alert" className="text-destructive text-copy">
          {errors.root.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {t('common:action.save')}
        </Button>
      </div>
    </form>
  )
}
