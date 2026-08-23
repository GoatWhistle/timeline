import { useQuery } from '@tanstack/react-query'
import { Archive, Send } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  adminHackathonQuery,
  useArchiveHackathon,
  usePublishHackathon,
  useUpdateHackathon,
} from '@/modules/hackathons/api'
import { HackathonForm } from '@/modules/hackathons/hackathon-form'
import { HackathonStateBadge } from '@/modules/hackathons/state-badge'
import { ParticipantsTab } from '@/modules/participants/participants-tab'
import { RegistrationTab } from '@/modules/registration/registration-tab'
import { StatusesTab } from '@/modules/registration/statuses-tab'
import { StagesTab } from '@/modules/stages/stages-tab'
import { formatDate } from '@/shared/lib/datetime'
import { useUrlFilters } from '@/shared/lib/use-url-filters'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { PageHeader } from '@/shared/ui/page-header'
import { ErrorState, LoadingState } from '@/shared/ui/states'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

const TABS = ['general', 'stages', 'participants', 'registration', 'statuses'] as const
const DEFAULTS = { tab: 'general' }

/**
 * Композиция административной карточки. Страница живёт в слое приложения,
 * потому что собирает несколько доменных модулей: кросс-импорты между самими
 * модулями запрещены (раздел 14.2 ТЗ).
 */
export function AdminHackathonPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const tab = (TABS as readonly string[]).includes(filters.tab) ? filters.tab : 'general'

  const query = useQuery(adminHackathonQuery(id))
  const update = useUpdateHackathon(id)
  const publish = usePublishHackathon(id)
  const archive = useArchiveHackathon(id)

  const [publishOpen, setPublishOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const hackathon = query.data

  return (
    <div>
      <PageHeader
        title={hackathon.title}
        description={`${formatDate(hackathon.start_at)} — ${formatDate(hackathon.end_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <HackathonStateBadge state={hackathon.state} />
            {!hackathon.published_at && !hackathon.archived_at && (
              <Button onClick={() => setPublishOpen(true)}>
                <Send className="size-4" />
                Опубликовать
              </Button>
            )}
            {!hackathon.archived_at && (
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
              <HackathonForm
                hackathon={hackathon}
                submitLabel="Сохранить"
                onSubmit={async (payload) => {
                  await update.mutateAsync(payload)
                  toast.success('Хакатон сохранён', {
                    description: 'Изменение даты окончания пересчитывает расписание напоминаний',
                  })
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <StagesTab hackathon={hackathon} />
        </TabsContent>

        <TabsContent value="participants">
          <ParticipantsTab hackathonId={hackathon.id} />
        </TabsContent>

        <TabsContent value="registration">
          <RegistrationTab hackathon={hackathon} />
        </TabsContent>

        <TabsContent value="statuses">
          <StatusesTab hackathonId={hackathon.id} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="Опубликовать хакатон?"
        description="Назначенные участники увидят хакатон, планировщик начнёт создавать уведомления, включая отложенные первичные."
        confirmLabel="Опубликовать"
        disabled={publish.isPending}
        onConfirm={async () => {
          await publish
            .mutateAsync()
            .then(() => toast.success('Хакатон опубликован'))
            .catch(() => toast.error('Не удалось опубликовать'))
          setPublishOpen(false)
        }}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Отправить хакатон в архив?"
        description="Архивирование необратимо в текущей версии. Запланированные уведомления будут отменены, новые создаваться не будут."
        confirmLabel="В архив"
        destructive
        disabled={archive.isPending}
        onConfirm={async () => {
          await archive
            .mutateAsync()
            .then(() => {
              toast.success('Хакатон архивирован')
              navigate('/admin/hackathons')
            })
            .catch(() => toast.error('Не удалось архивировать'))
          setArchiveOpen(false)
        }}
      />
    </div>
  )
}
