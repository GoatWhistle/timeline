import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  registrationQuery,
  useCreateRegistration,
  useToggleRegistration,
  useUpdateRegistration,
} from '@/entities/registration/registration.queries'
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
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonDetail } from '@/shared/ui/states'
import { RegistrationFacts } from './registration-facts'

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

  const loadedDeadline = registration?.deadline_at ?? null
  const [deadline, setDeadline] = useState<Civil>(() => civilFromIso(loadedDeadline))
  const [syncedDeadline, setSyncedDeadline] = useState<string | null>(loadedDeadline)
  const [deadlineError, setDeadlineError] = useState<string | undefined>(undefined)

  if (loadedDeadline !== syncedDeadline) {
    setSyncedDeadline(loadedDeadline)
    setDeadline(civilFromIso(loadedDeadline))
  }

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
      <div className="@container">
        <div className="grid items-start gap-6 @5xl:grid-cols-[minmax(0,1fr)_320px]">
          {registration && (
            <aside className="order-last @5xl:order-none @5xl:sticky @5xl:top-4 @5xl:col-start-2 @5xl:row-start-1">
              <Card>
                <CardContent>
                  <RegistrationFacts
                    registration={registration}
                    busy={toggle.isPending}
                    onToggle={() =>
                      toggle
                        .mutateAsync(registration.state === 'ACTIVE' ? 'disable' : 'enable')
                        .then(() => toast.success(t('tab.stateChanged')))
                        .catch(() => toast.error(t('tab.stateFailed')))
                    }
                  />
                </CardContent>
              </Card>
            </aside>
          )}

          <div className="flex min-w-0 flex-col gap-6 @5xl:col-start-1 @5xl:row-start-1">
            <Card>
              <CardHeader>
                <CardTitle>{t('tab.title')}</CardTitle>
                <CardDescription>{t('tab.hint')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
                  <div className="grid gap-4 @2xl:grid-cols-2">
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
                  </div>

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

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      {registration ? t('common:action.save') : t('tab.create')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </QueryBoundary>
  )
}
