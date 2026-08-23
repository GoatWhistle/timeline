import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink } from 'lucide-react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { formatDate, formatDateTime, formatRelative } from '@/shared/lib/datetime'
import { STAGE_TYPE_COLOR, STAGE_TYPE_LABEL } from '@/shared/lib/enums'
import { Badge, Dot } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'
import { ErrorState, LoadingState } from '@/shared/ui/states'
import { hackathonCardQuery, useMarkRegistrationDone } from './api'
import { HackathonStateBadge, RegistrationStatusBadge } from './state-badge'

export function HackathonCardPage() {
  const { id = '' } = useParams()
  const query = useQuery(hackathonCardQuery(id))
  const markDone = useMarkRegistrationDone(id)

  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const card = query.data
  const { hackathon, registration, registration_status: status } = card

  async function onMarkDone() {
    try {
      await markDone.mutateAsync()
      toast.success('Регистрация отмечена', {
        description: 'Напоминания по этому хакатону больше не придут',
      })
    } catch {
      toast.error('Не удалось изменить статус')
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={hackathon.title}
        description={
          hackathon.organizer
            ? `${hackathon.organizer} · ${formatDate(hackathon.start_at)} — ${formatDate(hackathon.end_at)}`
            : `${formatDate(hackathon.start_at)} — ${formatDate(hackathon.end_at)}`
        }
        actions={<HackathonStateBadge state={hackathon.state} />}
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
            {hackathon.description && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Описание</p>
                <p>{hackathon.description}</p>
              </div>
            )}
            {hackathon.website_url && (
              <div className="col-span-2">
                <a
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  href={hackathon.website_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Сайт хакатона
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
