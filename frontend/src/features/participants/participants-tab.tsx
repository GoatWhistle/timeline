import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  participantsQuery,
  useReactivateParticipant,
  useRemoveParticipants,
  useUpdateTeamRole,
} from '@/entities/participant/participant.queries'
import { reportBatchResult } from '@/shared/api/batch-result/batch-result'
import type { ParticipantResponse, RegistrationStatusValue } from '@/shared/api/types.gen'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { useUndoableAction } from '@/shared/hooks/use-undoable-action/use-undoable-action'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'
import { AddParticipantsDialog } from './add-participants-dialog'
import { CopyParticipantsDialog } from './copy-participants-dialog'
import { ALL, ParticipantsFilters } from './participants-filters/participants-filters'
import { ParticipantsTable } from './participants-table/participants-table'
import { TeamRoleDialog } from './team-role-dialog/team-role-dialog'

const DEFAULTS = { role: '', status: ALL, removed: '' }

export function ParticipantsTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation('registration')
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [roleInput, setRoleInput] = useState(filters.role)
  const role = useDebouncedValue(roleInput, 300)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const undoable = useUndoableAction()
  const [editing, setEditing] = useState<ParticipantResponse | null>(null)
  const [roleDraft, setRoleDraft] = useState('')

  const query = useQuery(
    participantsQuery(eventId, {
      page,
      ...(role ? { team_role: role } : {}),
      ...(filters.status !== ALL
        ? { registration_status: filters.status as RegistrationStatusValue }
        : {}),
      ...(filters.removed === '1' ? { include_removed: true } : {}),
    }),
  )

  const removeMany = useRemoveParticipants(eventId)
  const updateRole = useUpdateTeamRole(eventId)
  const reactivate = useReactivateParticipant(eventId)

  const items = query.data?.items ?? []
  const selectableIds = items
    .filter((item) => item.participation_status === 'ASSIGNED')
    .map((item) => item.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(selectableIds) : new Set())
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function onRemoveSelected() {
    const ids = [...selected]
    if (ids.length === 0) return
    setSelected(new Set())
    undoable({
      key: `remove-participants-${eventId}`,
      message: t('participants.removeScheduled', { count: ids.length }),
      description: t('participants.removeUndoHint'),
      onUndo: () => setSelected(new Set(ids)),
      run: async () => {
        try {
          const result = await removeMany.mutateAsync({ participant_ids: ids })
          reportBatchResult(result, t('participants.removed'))
        } catch {
          toast.error(t('participants.removeFailed'))
          setSelected(new Set(ids))
        }
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ParticipantsFilters
        roleInput={roleInput}
        status={filters.status}
        removed={filters.removed}
        onRoleInputChange={(value) => {
          setRoleInput(value)
          setFilters({ role: value || undefined })
        }}
        onStatusChange={(value) => setFilters({ status: value })}
        onRemovedToggle={() => setFilters({ removed: filters.removed === '1' ? undefined : '1' })}
        onCopy={() => setCopyOpen(true)}
        onAdd={() => setAddOpen(true)}
      />

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-2">
          <p className="text-sm">{t('participants.selected', { count: selected.size })}</p>
          <Button variant="destructive" size="sm" onClick={onRemoveSelected}>
            <Trash2 className="size-4" />
            {t('participants.removeSelected')}
          </Button>
        </div>
      )}

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={<SkeletonTable rows={10} columns={6} density="action" />}
      >
        {items.length === 0 ? (
          <EmptyState
            title={t('participants.emptyTitle')}
            description={t('participants.emptyHint')}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <ParticipantsTable
              items={items}
              selected={selected}
              allSelected={allSelected}
              reactivatePending={reactivate.isPending}
              onToggleAll={toggleAll}
              onToggleOne={toggleOne}
              onEdit={(item) => {
                setEditing(item)
                setRoleDraft(item.team_role)
              }}
              onReactivate={(item) =>
                reactivate
                  .mutateAsync({ id: item.id, team_role: item.team_role })
                  .then(() => toast.success(t('participants.restored')))
                  .catch(() => toast.error(t('participants.restoreFailed')))
              }
            />

            {query.data && <Pagination meta={query.data.meta} onPageChange={setPage} />}
          </div>
        )}
      </QueryBoundary>

      <AddParticipantsDialog eventId={eventId} open={addOpen} onOpenChange={setAddOpen} />
      <CopyParticipantsDialog eventId={eventId} open={copyOpen} onOpenChange={setCopyOpen} />

      <TeamRoleDialog
        open={editing !== null}
        value={roleDraft}
        disabled={updateRole.isPending}
        onOpenChange={(open) => !open && setEditing(null)}
        onValueChange={setRoleDraft}
        onCancel={() => setEditing(null)}
        onSave={async () => {
          if (!editing) return
          await updateRole
            .mutateAsync({ id: editing.id, team_role: roleDraft.trim() })
            .then(() => toast.success(t('participants.roleChanged')))
            .catch(() => toast.error(t('participants.roleChangeFailed')))
          setEditing(null)
        }}
      />
    </div>
  )
}
