import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  teamEventLinksQuery,
  useAddTeamEventLink,
  useUpdateTeamEventLink,
} from '@/entities/team/team-links.queries'
import type { NewLinkValues } from '@/features/profile/profile-links-card/links-schema'
import { ProfileLinkForm } from '@/features/profile/profile-links-card/profile-link-form'
import { TeamLinksList } from './team-links-list'

const LINK_LIMIT = 20

export function TeamLinksCard({ teamId, eventId }: { teamId: string; eventId: string }) {
  const { t } = useTranslation('team')
  const links = useQuery(teamEventLinksQuery(teamId, eventId))
  const add = useAddTeamEventLink(teamId, eventId)
  const update = useUpdateTeamEventLink(teamId, eventId)
  const [editingId, setEditingId] = useState<string | null>(null)

  const items = links.data?.items ?? []
  const canWrite = links.data?.can_write ?? false
  const editing = items.find((link) => link.id === editingId) ?? null

  async function onAdd(values: NewLinkValues) {
    await add.mutateAsync({
      url: values.url,
      ...(values.label === '' ? {} : { label: values.label }),
    })
    toast.success(t('links.added'))
  }

  async function onSave(values: NewLinkValues) {
    if (editing === null) return
    const had = editing.label ?? ''
    try {
      await update.mutateAsync({
        id: editing.id,
        body: {
          url: values.url,
          ...(values.label === '' && had !== '' ? { clear_label: true } : {}),
          ...(values.label === '' ? {} : { label: values.label }),
        },
      })
    } catch (error) {
      toast.error(t('links.saveFailed'))
      throw error
    }
    toast.success(t('links.saved'))
    setEditingId(null)
  }

  return (
    <section className="flex flex-col gap-4" aria-label={t('links.title')}>
      <div>
        <h3 className="font-medium text-body">{t('links.title')}</h3>
        <p className="mt-1 text-meta text-muted-foreground">{t('links.hint')}</p>
      </div>

      <TeamLinksList
        teamId={teamId}
        eventId={eventId}
        links={items}
        canWrite={canWrite}
        editingId={editing === null ? null : editing.id}
        onEdit={setEditingId}
      />

      {canWrite && (
        <section
          aria-label={editing === null ? t('links.addTitle') : t('links.editTitle')}
          className="flex flex-col gap-4 rounded-control border border-border bg-surface-1 p-4"
        >
          <h4 className="font-medium text-caption text-muted-foreground uppercase tracking-wide">
            {editing === null ? t('links.addTitle') : t('links.editTitle')}
          </h4>
          {editing === null ? (
            <ProfileLinkForm
              key="team-link-add"
              idPrefix={`team-link-new-${eventId}`}
              initial={{ url: '', label: '' }}
              submitLabel={t('links.add')}
              submitDisabled={items.length >= LINK_LIMIT}
              footnote={items.length >= LINK_LIMIT ? t('links.limitReached') : undefined}
              clearOnSubmit
              onSubmit={onAdd}
            />
          ) : (
            <ProfileLinkForm
              key={`team-link-edit-${editing.id}`}
              idPrefix={`team-link-edit-${editing.id}`}
              initial={{ url: editing.url, label: editing.label ?? '' }}
              submitLabel={t('links.save')}
              canClearLabel={(editing.label ?? '') !== ''}
              onSubmit={onSave}
              onCancel={() => setEditingId(null)}
            />
          )}
        </section>
      )}
    </section>
  )
}
