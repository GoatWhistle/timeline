import { useQuery } from '@tanstack/react-query'
import { Archive, Send } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  adminEventQuery,
  useArchiveEvent,
  usePublishEvent,
  useUpdateEvent,
} from '@/entities/event/event.queries'
import { EventForm } from '@/entities/event/event-form'
import { EventStateBadge } from '@/entities/event/event-state-badge'
import { ParticipantsTab } from '@/features/participants/participants-tab'
import { RegistrationTab } from '@/features/registration/registration-tab'
import { StatusesTab } from '@/features/registration/statuses-tab'
import { StagesTab } from '@/features/stages/stages-tab'
import { formatDate } from '@/shared/datetime/datetime'
import { useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import { Card, CardContent } from '@/shared/ui/layout/card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/navigation/tabs'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'

const TABS = ['general', 'stages', 'participants', 'registration', 'statuses'] as const
const DEFAULTS = { tab: 'general' }

export function AdminEventPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const tab = (TABS as readonly string[]).includes(filters.tab) ? filters.tab : 'general'

  const query = useQuery(adminEventQuery(id))
  const update = useUpdateEvent(id)
  const publish = usePublishEvent(id)
  const archive = useArchiveEvent(id)

  const [publishOpen, setPublishOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const event = query.data

  return (
    <div>
      <PageHeader
        title={event.title}
        description={`${formatDate(event.start_at)} — ${formatDate(event.end_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <EventStateBadge state={event.state} />
            {!event.published_at && !event.archived_at && (
              <Button onClick={() => setPublishOpen(true)}>
                <Send className="size-4" />
                Опубликовать
              </Button>
            )}
            {!event.archived_at && (
              <Button variant="outline" onClick={() => setArchiveOpen(true)}>
                <Archive className="size-4" />В архив
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(value) => setFilters({ tab: value }, { resetPage: true })}>
        <TabsList>
          <TabsTrigger value="general">Общее</TabsTrigger>
          <TabsTrigger value="stages">Этапы</TabsTrigger>
          <TabsTrigger value="participants">Участники</TabsTrigger>
          <TabsTrigger value="registration">Регистрация и правила</TabsTrigger>
          <TabsTrigger value="statuses">Статусы</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="max-w-3xl">
            <CardContent className="pt-6">
              <EventForm
                event={event}
                submitLabel="Сохранить"
                onSubmit={async (payload) => {
                  await update.mutateAsync(payload)
                  toast.success('Событие сохранён', {
                    description: 'Изменение даты окончания пересчитывает расписание напоминаний',
                  })
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <StagesTab event={event} />
        </TabsContent>

        <TabsContent value="participants">
          <ParticipantsTab eventId={event.id} />
        </TabsContent>

        <TabsContent value="registration">
          <RegistrationTab event={event} />
        </TabsContent>

        <TabsContent value="statuses">
          <StatusesTab eventId={event.id} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="Опубликовать событие?"
        description="Назначенные участники увидят событие, планировщик начнёт создавать уведомления, включая отложенные первичные."
        confirmLabel="Опубликовать"
        disabled={publish.isPending}
        onConfirm={async () => {
          await publish
            .mutateAsync()
            .then(() => toast.success('Событие опубликован'))
            .catch(() => toast.error('Не удалось опубликовать'))
          setPublishOpen(false)
        }}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Отправить событие в архив?"
        description="Архивирование необратимо в текущей версии. Запланированные уведомления будут отменены, новые создаваться не будут."
        confirmLabel="В архив"
        destructive
        disabled={archive.isPending}
        onConfirm={async () => {
          await archive
            .mutateAsync()
            .then(() => {
              toast.success('Событие архивирован')
              navigate('/admin/events')
            })
            .catch(() => toast.error('Не удалось архивировать'))
          setArchiveOpen(false)
        }}
      />
    </div>
  )
}
