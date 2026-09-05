import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { REGISTRATION_STATE_KEY } from '@/entities/registration/registration.labels'
import {
  registrationQuery,
  useCreateRegistration,
  useToggleRegistration,
  useUpdateRegistration,
} from '@/entities/registration/registration.queries'
import { ChannelMatrix } from '@/features/channel-matrix/channel-matrix'
import { isApiError } from '@/shared/api/errors'
import type { EventResponse } from '@/shared/api/types.gen'
import { type Civil, civilFromIso, civilToIso, isCivil } from '@/shared/datetime/civil'
import { formatDateTime } from '@/shared/datetime/datetime'
import { fieldMessage } from '@/shared/forms/field-message'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { isAcceptedUrl, normalizeFormUrl } from '@/shared/forms/url'
import { MomentField } from '@/shared/ui/forms/calendar/moment-field'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Textarea } from '@/shared/ui/forms/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonDetail } from '@/shared/ui/states'
import { RulesEditor } from './rules-editor'

const schema = z.object({
  url: z.string().refine((value) => isAcceptedUrl(value), {
    message: 'event:form.urlInvalid',
  }),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function RegistrationTab({ event }: { event: EventResponse }) {
  const { t } = useTranslation('registration')
  const query = useQuery(registrationQuery(event.id))
  const create = useCreateRegistration(event.id)
  const update = useUpdateRegistration(event.id)
  const toggle = useToggleRegistration(event.id)

  const registration = query.data
  const missing = query.isError && isApiError(query.error) && query.error.status === 404

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      url: registration?.url ?? '',
      description: registration?.description ?? '',
    },
  })

  const [deadline, setDeadline] = useState<Civil>(() => civilFromIso(registration?.deadline_at))
  const [deadlineError, setDeadlineError] = useState<string | undefined>(undefined)

  async function submit(values: FormValues) {
    const deadlineIso = isCivil(deadline) ? civilToIso(deadline) : null
    if (!deadlineIso) {
      setDeadlineError('errors:field.required')
      return
    }
    setDeadlineError(undefined)
    const payload = {
      url: normalizeFormUrl(values.url) ?? values.url,
      deadline_at: deadlineIso,
      ...(values.description ? { description: values.description } : {}),
    }
    try {
      if (registration) {
        await update.mutateAsync(payload)
        toast.success(t('tab.saved'), {
          description: t('tab.savedHint'),
        })
      } else {
        await create.mutateAsync(payload)
        toast.success(t('tab.created'), {
          description: t('tab.createdHint'),
        })
      }
    } catch (error) {
      applyServerErrors(error, setError, ['url', 'description'], ['deadline_at'])
      if (isApiError(error)) {
        const failed = error.fields.find((item) => item.field === 'deadline_at')
        if (failed) setDeadlineError(fieldMessage(failed))
      }
    }
  }

  return (
    <QueryBoundary
      isPending={query.isPending}
      isFetching={query.isFetching}
      isError={query.isError && !missing}
      error={query.error}
      onRetry={() => query.refetch()}
      hasData={registration !== undefined || missing}
      skeleton={<SkeletonDetail />}
    >
      <div className="flex max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{t('tab.title')}</CardTitle>
                <CardDescription>{t('tab.hint')}</CardDescription>
              </div>
              {registration && (
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={registration.state === 'ACTIVE' ? 'primary' : 'danger'}>
                    {t(REGISTRATION_STATE_KEY[registration.state])}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={toggle.isPending}
                    onClick={() =>
                      toggle
                        .mutateAsync(registration.state === 'ACTIVE' ? 'disable' : 'enable')
                        .then(() => toast.success(t('tab.stateChanged')))
                        .catch(() => toast.error(t('tab.stateFailed')))
                    }
                  >
                    {registration.state === 'ACTIVE' ? t('tab.disable') : t('tab.enable')}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
              <Field label={t('tab.urlLabel')} htmlFor="reg-url" error={errors.url?.message}>
                <Input id="reg-url" aria-invalid={Boolean(errors.url)} {...register('url')} />
              </Field>

              <MomentField
                id="reg-deadline"
                label={t('tab.deadlineLabel')}
                value={deadline}
                error={deadlineError}
                hint={t('tab.deadlineHint', { date: formatDateTime(event.end_at) })}
                required
                onChange={(next) => {
                  setDeadline(next)
                  setDeadlineError(undefined)
                }}
              />

              <Field
                label={t('tab.descriptionLabel')}
                htmlFor="reg-description"
                error={errors.description?.message}
              >
                <Textarea id="reg-description" {...register('description')} />
              </Field>

              {errors.root && (
                <p role="alert" className="text-destructive text-copy">
                  {errors.root.message}
                </p>
              )}

              <div>
                <Button type="submit" disabled={isSubmitting}>
                  {registration ? t('common:action.save') : t('tab.create')}
                </Button>
              </div>
            </form>

            {registration && (
              <dl className="mt-6 grid grid-cols-3 gap-4 border-t pt-4 text-copy">
                <div>
                  <dt className="text-muted-foreground">{t('tab.scheduleVersion')}</dt>
                  <dd className="font-medium">{registration.schedule_version}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('tab.activationVersion')}</dt>
                  <dd className="font-medium">{registration.activation_version}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('tab.contentVersion')}</dt>
                  <dd className="font-medium">{registration.notification_content_version}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {registration && (
          <Card>
            <CardHeader>
              <CardTitle>{t('rules.title')}</CardTitle>
              <CardDescription>{t('rules.hint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <RulesEditor eventId={event.id} />
            </CardContent>
          </Card>
        )}

        {registration && (
          <Card>
            <CardContent className="pt-6">
              <ChannelMatrix eventId={event.id} />
            </CardContent>
          </Card>
        )}
      </div>
    </QueryBoundary>
  )
}
