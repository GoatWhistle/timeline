import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { isApiError } from '@/shared/api/errors'
import type { HackathonResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/lib/datetime'
import { REGISTRATION_STATE_LABEL } from '@/shared/lib/enums'
import { applyServerErrors } from '@/shared/lib/form'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { ErrorState, LoadingState } from '@/shared/ui/states'
import { Textarea } from '@/shared/ui/textarea'
import {
  registrationQuery,
  useCreateRegistration,
  useToggleRegistration,
  useUpdateRegistration,
} from './api'
import { RulesEditor } from './rules-editor'

function toLocalInput(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const schema = z.object({
  url: z.string().refine((value) => value.startsWith('https://'), {
    message: 'Ссылка должна начинаться с https://',
  }),
  deadline_at: z.string().min(1, 'Укажите дедлайн'),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function RegistrationTab({ hackathon }: { hackathon: HackathonResponse }) {
  const query = useQuery(registrationQuery(hackathon.id))
  const create = useCreateRegistration(hackathon.id)
  const update = useUpdateRegistration(hackathon.id)
  const toggle = useToggleRegistration(hackathon.id)

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
      deadline_at: toLocalInput(registration?.deadline_at),
      description: registration?.description ?? '',
    },
  })

  if (query.isPending) return <LoadingState />
  if (query.isError && !missing) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  }

  async function submit(values: FormValues) {
    const payload = {
      url: values.url,
      deadline_at: new Date(values.deadline_at).toISOString(),
      ...(values.description ? { description: values.description } : {}),
    }
    try {
      if (registration) {
        await update.mutateAsync(payload)
        toast.success('Регистрация сохранена', {
          description:
            'Изменение ссылки или дедлайна отменяет запланированные уведомления и создаёт новые',
        })
      } else {
        await create.mutateAsync(payload)
        toast.success('Регистрация создана', {
          description: 'Назначенным участникам созданы статусы «не выполнена»',
        })
      }
    } catch (error) {
      applyServerErrors(error, setError, ['url', 'deadline_at', 'description'])
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Регистрация</CardTitle>
              <CardDescription>
                Дедлайн не может быть позже окончания хакатона. Изменение ссылки версионирует
                содержимое уведомлений.
              </CardDescription>
            </div>
            {registration && (
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={registration.state === 'ACTIVE' ? 'primary' : 'danger'}>
                  {REGISTRATION_STATE_LABEL[registration.state]}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={toggle.isPending}
                  onClick={() =>
                    toggle
                      .mutateAsync(registration.state === 'ACTIVE' ? 'disable' : 'enable')
                      .then(() => toast.success('Состояние регистрации изменено'))
                      .catch(() => toast.error('Не удалось изменить состояние'))
                  }
                >
                  {registration.state === 'ACTIVE' ? 'Выключить' : 'Включить'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
            <Field label="Ссылка на регистрацию" htmlFor="reg-url" error={errors.url?.message}>
              <Input id="reg-url" aria-invalid={Boolean(errors.url)} {...register('url')} />
            </Field>

            <Field
              label="Дедлайн"
              htmlFor="reg-deadline"
              error={errors.deadline_at?.message}
              hint={`Окончание хакатона: ${formatDateTime(hackathon.end_at)}`}
            >
              <Input
                id="reg-deadline"
                type="datetime-local"
                aria-invalid={Boolean(errors.deadline_at)}
                {...register('deadline_at')}
              />
            </Field>

            <Field label="Описание" htmlFor="reg-description" error={errors.description?.message}>
              <Textarea id="reg-description" {...register('description')} />
            </Field>

            {errors.root && (
              <p role="alert" className="text-destructive text-sm">
                {errors.root.message}
              </p>
            )}

            <div>
              <Button type="submit" disabled={isSubmitting}>
                {registration ? 'Сохранить' : 'Создать регистрацию'}
              </Button>
            </div>
          </form>

          {registration && (
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t pt-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Версия расписания</dt>
                <dd className="font-medium">{registration.schedule_version}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Версия активации</dt>
                <dd className="font-medium">{registration.activation_version}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Версия содержимого</dt>
                <dd className="font-medium">{registration.notification_content_version}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {registration && (
        <Card>
          <CardHeader>
            <CardTitle>Правила напоминаний</CardTitle>
            <CardDescription>
              Не более 10 правил. Правило с отрицательным смещением уведомляет о просрочке и не
              срабатывает после окончания хакатона.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RulesEditor hackathonId={hackathon.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
