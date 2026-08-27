import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink } from 'lucide-react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { eventCardQuery, useMarkRegistrationDone } from '@/entities/event/event.queries'
import { EventStateBadge, RegistrationStatusBadge } from '@/entities/event/event-state-badge'
import { STAGE_TYPE_COLOR, STAGE_TYPE_LABEL } from '@/entities/stage/stage.labels'
import { formatDate, formatDateTime, formatRelative } from '@/shared/datetime/datetime'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { Dot } from '@/shared/ui/primitives/dot'

export function EventCardPage() {
  const { id = '' } = useParams()
  const query = useQuery(eventCardQuery(id))
  const markDone = useMarkRegistrationDone(id)

  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const card = query.data
  const { event, registration, registration_status: status } = card

  async function onMarkDone() {
    try {
      await markDone.mutateAsync()
      toast.success('Регистрация отмечена', {
        description: 'Напоминания по этому событию больше не придут',
      })
    } catch {
      toast.error('Не удалось изменить статус')
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={event.title}
        description={
          event.organizer
            ? `${event.organizer} · ${formatDate(event.start_at)} — ${formatDate(event.end_at)}`
            : `${formatDate(event.start_at)} — ${formatDate(event.end_at)}`
        }
        actions={<EventStateBadge state={event.state} />}
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Участие</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Роль в команде</p>
              <p className="font-medium">{card.team_role ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ближайший этап</p>
              <p className="font-medium">
                {card.next_stage
                  ? `${card.next_stage.name} · ${formatDate(card.next_stage.start_at)}`
                  : '—'}
              </p>
            </div>
            {event.description && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Описание</p>
                <p>{event.description}</p>
              </div>
            )}
            {event.website_url && (
              <div className="col-span-2">
                <a
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  href={event.website_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Сайт события
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {registration && (
          <Card>
            <CardHeader>
              <CardTitle>Регистрация</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">Дедлайн</p>
                  <p className="font-medium">
                    {formatDateTime(registration.deadline_at)}
                    {registration.deadline_at && (
                      <span className="ml-2 text-muted-foreground">
                        ({formatRelative(registration.deadline_at)})
                      </span>
                    )}
                  </p>
                </div>
                {status && <RegistrationStatusBadge status={status.status} />}
              </div>

              {registration.description && <p className="text-sm">{registration.description}</p>}

              <div className="flex items-center gap-3">
                <Button asChild variant="outline">
                  <a href={registration.url} target="_blank" rel="noreferrer">
                    Перейти к регистрации
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </Button>

                {card.can_mark_done && (
                  <Button onClick={onMarkDone} disabled={markDone.isPending}>
                    <CheckCircle2 className="size-4" aria-hidden="true" />Я зарегистрировался
                  </Button>
                )}
              </div>

              {status?.status === 'DONE' && status.registered_at && (
                <p className="text-muted-foreground text-sm">
                  Отмечено {formatDateTime(status.registered_at)}
                </p>
              )}
              {registration.state === 'DISABLED' && (
                <p className="text-muted-foreground text-sm">
                  Регистрация выключена администратором: действия недоступны.
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Система не проверяет внешний сайт: отметка о регистрации — ваш самоотчёт.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Этапы</CardTitle>
          </CardHeader>
          <CardContent>
            {card.stages.length === 0 ? (
              <p className="text-muted-foreground text-sm">Этапы не заданы</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {card.stages.map((stage) => (
                  <li key={stage.id} className="flex items-start gap-3">
                    <Dot className={`mt-1.5 ${STAGE_TYPE_COLOR[stage.type]}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{stage.name}</p>
                      <p className="text-muted-foreground text-sm">
                        <Badge tone="neutral">{STAGE_TYPE_LABEL[stage.type]}</Badge>
                        <span className="ml-2">
                          {formatDate(stage.start_at)} — {formatDate(stage.end_at)}
                        </span>
                      </p>
                      {stage.description && <p className="text-sm">{stage.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
