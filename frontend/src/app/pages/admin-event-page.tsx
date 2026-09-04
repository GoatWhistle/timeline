import { useQuery } from '@tanstack/react-query'
import { Archive, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  adminEventQuery,
  useArchiveEvent,
  usePublishEvent,
  useUpdateEvent,
} from '@/entities/event/event.queries'
import { EventForm } from '@/entities/event/event-form'
import { EventStateBadge } from '@/entities/event/event-state-badge'
import { CoverField } from '@/features/event-cover'
import { ParticipantsTab } from '@/features/participants/participants-tab'
import { RegistrationTab } from '@/features/registration/registration-tab'
import { StatusesTab } from '@/features/registration/statuses-tab'
import { StagesTab } from '@/features/stages/stages-tab'
import { TracksTab } from '@/features/tracks/tracks-tab'
import { formatDate } from '@/shared/datetime/datetime'
import { useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { Card, CardContent } from '@/shared/ui/layout/card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/navigation/tabs'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonDetail } from '@/shared/ui/states'

const TABS = ['general', 'stages', 'tracks', 'participants', 'registration', 'statuses'] as const
const DEFAULTS = { tab: 'general' }

export function AdminEventPage() {
  const { t } = useTranslation('event')
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const query = useQuery(adminEventQuery(id))
  const update = useUpdateEvent(id)
  const publish = usePublishEvent(id)
  const archive = useArchiveEvent(id)

  const [publishOpen, setPublishOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const event = query.data
  const available = (TABS as readonly string[]).filter(
    (name) => name !== 'tracks' || event?.kind === 'HACKATHON',
  )
  const tab = available.includes(filters.tab) ? filters.tab : 'general'

  return (
    <QueryBoundary
      isPending={query.isPending}
      isFetching={query.isFetching}
      isError={query.isError}
      error={query.error}
      onRetry={() => query.refetch()}
      hasData={event !== undefined}
      skeleton={<SkeletonDetail />}
      action={
        <Button asChild variant="outline">
          <Link to="/admin/events">{t('shell:nav.adminEvents')}</Link>
        </Button>
      }
    >
      {event && (
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
                    {t('detail.publish')}
                  </Button>
                )}
                {!event.archived_at && (
                  <Button variant="outline" onClick={() => setArchiveOpen(true)}>
                    <Archive className="size-4" />
                    {t('detail.archive')}
                  </Button>
                )}
              </div>
            }
          />

          <Tabs
            value={tab}
            onValueChange={(value) => setFilters({ tab: value }, { resetPage: true })}
          >
            <TabsList>
              <TabsTrigger value="general">{t('detail.tabGeneral')}</TabsTrigger>
              <TabsTrigger value="stages">{t('detail.tabStages')}</TabsTrigger>
              {event.kind === 'HACKATHON' && (
                <TabsTrigger value="tracks">{t('detail.tabTracks')}</TabsTrigger>
              )}
              <TabsTrigger value="participants">{t('detail.tabParticipants')}</TabsTrigger>
              <TabsTrigger value="registration">{t('detail.tabRegistration')}</TabsTrigger>
              <TabsTrigger value="statuses">{t('detail.tabStatuses')}</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="flex max-w-5xl flex-col gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <EventForm
                      event={event}
                      mode="edit"
                      submitLabel={t('common:action.save')}
                      onSubmit={async (payload) => {
                        await update.mutateAsync(payload)
                        toast.success(t('detail.saved'), {
                          description: t('detail.savedHint'),
                        })
                      }}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <CoverField
                      eventId={event.id}
                      title={event.title}
                      coverUrl={event.cover_url}
                      coverSource={event.cover_source}
                      hasWebsite={Boolean(event.website_url)}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex flex-col gap-4 pt-6">
                    <h2 className="font-semibold text-heading">{t('detail.tabStages')}</h2>
                    <StagesTab event={event} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="stages">
              <StagesTab event={event} />
            </TabsContent>

            <TabsContent value="tracks">
              <TracksTab event={event} />
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
            title={t('detail.confirmPublishTitle')}
            description={t('detail.confirmPublishHint')}
            confirmLabel={t('detail.publish')}
            disabled={publish.isPending}
            onConfirm={async () => {
              await publish
                .mutateAsync()
                .then(() => toast.success(t('detail.published')))
                .catch(() => toast.error(t('detail.publishFailed')))
              setPublishOpen(false)
            }}
          />

          <ConfirmDialog
            open={archiveOpen}
            onOpenChange={setArchiveOpen}
            title={t('detail.confirmArchiveTitle')}
            description={t('detail.confirmArchiveHint')}
            confirmLabel={t('detail.archive')}
            destructive
            disabled={archive.isPending}
            onConfirm={async () => {
              await archive
                .mutateAsync()
                .then(() => {
                  toast.success(t('detail.archived'))
                  navigate('/admin/events')
                })
                .catch(() => toast.error(t('detail.archiveFailed')))
              setArchiveOpen(false)
            }}
          />
        </div>
      )}
    </QueryBoundary>
  )
}
