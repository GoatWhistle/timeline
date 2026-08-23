import { useQuery } from '@tanstack/react-query'
import { Copy, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ParticipantResponse, RegistrationStatusValue } from '@/shared/api/types.gen'
import { reportBatchResult } from '@/shared/lib/batch'
import { formatDate } from '@/shared/lib/datetime'
import {
  PARTICIPATION_STATUS_LABEL,
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_LABEL,
  REGISTRATION_STATUSES,
} from '@/shared/lib/enums'
import { useDebouncedValue } from '@/shared/lib/use-debounced-value'
import { usePageParam, useUrlFilters } from '@/shared/lib/use-url-filters'
import { Badge, Dot } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Pagination } from '@/shared/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { AddParticipantsDialog } from './add-participants-dialog'
import {
  participantsQuery,
  useReactivateParticipant,
  useRemoveParticipants,
  useUpdateTeamRole,
} from './api'
import { CopyParticipantsDialog } from './copy-participants-dialog'

const ALL = 'ALL'
const DEFAULTS = { role: '', status: ALL, removed: '' }

export function ParticipantsTab({ hackathonId }: { hackathonId: string }) {
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const [roleInput, setRoleInput] = useState(filters.role)
  const role = useDebouncedValue(roleInput, 300)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [editing, setEditing] = useState<ParticipantResponse | null>(null)
  const [roleDraft, setRoleDraft] = useState('')

  const query = useQuery(
    participantsQuery(hackathonId, {
      page,
      ...(role ? { team_role: role } : {}),
      ...(filters.status !== ALL
        ? { registration_status: filters.status as RegistrationStatusValue }
        : {}),
      ...(filters.removed === '1' ? { include_removed: true } : {}),
    }),
  )

  const removeMany = useRemoveParticipants(hackathonId)
  const updateRole = useUpdateTeamRole(hackathonId)
  const reactivate = useReactivateParticipant(hackathonId)

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

  async function onRemoveSelected() {
    try {
      const result = await removeMany.mutateAsync({ participant_ids: [...selected] })
      reportBatchResult(result, 'Участники удалены')
      setSelected(new Set())
      setRemoveOpen(false)
    } catch {
      toast.error('Не удалось удалить участников')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-52">
            <Input
              aria-label="Фильтр по роли"
              placeholder="Роль в команде"
              value={roleInput}
              onChange={(event) => {
                setRoleInput(event.target.value)
                setFilters({ role: event.target.value || undefined })
              }}
            />
          </div>
          <div className="w-56">
            <Select value={filters.status} onValueChange={(value) => setFilters({ status: value })}>
              <SelectTrigger aria-label="Статус регистрации">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Любой статус</SelectItem>
                {REGISTRATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {REGISTRATION_STATUS_LABEL[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={filters.removed === '1' ? 'default' : 'outline'}
            onClick={() => setFilters({ removed: filters.removed === '1' ? undefined : '1' })}
          >
            Показывать удалённых
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCopyOpen(true)}>
            <Copy className="size-4" />
            Скопировать состав
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Добавить
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-2">
          <p className="text-sm">Выбрано участников: {selected.size}</p>
          <Button variant="destructive" size="sm" onClick={() => setRemoveOpen(true)}>
            <Trash2 className="size-4" />
            Удалить выбранных
          </Button>
        </div>
      )}

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && items.length === 0 && (
        <EmptyState
          title="Участники не найдены"
          description="Добавьте участников или измените фильтры"
        />
      )}

      {query.data && items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Выбрать всех"
                    checked={allSelected}
                    onCheckedChange={(checked) => toggleAll(checked === true)}
                  />
                </TableHead>
                <TableHead>Участник</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Участие</TableHead>
                <TableHead>Регистрация</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} data-state={selected.has(item.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Выбрать ${item.user.display_name}`}
                      disabled={item.participation_status !== 'ASSIGNED'}
                      checked={selected.has(item.id)}
                      onCheckedChange={(checked) => toggleOne(item.id, checked === true)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{item.user.display_name}</span>
                    <span className="ml-2 text-muted-foreground">{item.user.email}</span>
                  </TableCell>
                  <TableCell>{item.team_role}</TableCell>
                  <TableCell>
                    <Badge tone={item.participation_status === 'ASSIGNED' ? 'primary' : 'danger'}>
                      {PARTICIPATION_STATUS_LABEL[item.participation_status]}
                    </Badge>
                    {item.removed_at && (
                      <span className="ml-2 text-muted-foreground text-xs">
                        {formatDate(item.removed_at)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.registration_status ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Dot
                          className={REGISTRATION_STATUS_COLOR[item.registration_status.status]}
                        />
                        {REGISTRATION_STATUS_LABEL[item.registration_status.status]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Изменить роль ${item.user.display_name}`}
                        onClick={() => {
                          setEditing(item)
                          setRoleDraft(item.team_role)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {item.participation_status === 'REMOVED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Вернуть ${item.user.display_name}`}
                          disabled={reactivate.isPending}
                          onClick={() =>
                            reactivate
                              .mutateAsync({ id: item.id, team_role: item.team_role })
                              .then(() => toast.success('Участник возвращён'))
                              .catch(() => toast.error('Не удалось вернуть участника'))
                          }
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      )}

      <AddParticipantsDialog hackathonId={hackathonId} open={addOpen} onOpenChange={setAddOpen} />
      <CopyParticipantsDialog
        hackathonId={hackathonId}
        open={copyOpen}
        onOpenChange={setCopyOpen}
      />

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Роль в команде</DialogTitle>
          </DialogHeader>
          <Field label="Роль" htmlFor="team-role">
            <Input
              id="team-role"
              value={roleDraft}
              onChange={(event) => setRoleDraft(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Отмена
            </Button>
            <Button
              disabled={!roleDraft.trim() || updateRole.isPending}
              onClick={async () => {
                if (!editing) return
                await updateRole
                  .mutateAsync({ id: editing.id, team_role: roleDraft.trim() })
                  .then(() => toast.success('Роль изменена'))
                  .catch(() => toast.error('Не удалось изменить роль'))
                setEditing(null)
              }}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Удалить выбранных участников?"
        description={`Участники (${selected.size}) перейдут в состояние «удалён», запланированные уведомления будут отменены. История статусов сохранится.`}
        confirmLabel="Удалить"
        destructive
        disabled={removeMany.isPending}
        onConfirm={onRemoveSelected}
      />
    </div>
  )
}
