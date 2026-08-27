import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCopyParticipants } from '@/entities/participant/participant.queries'
import { reportBatchResult } from '@/shared/api/batch-result/batch-result'
import { api, unwrap } from '@/shared/api/client'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'

export function CopyParticipantsDialog({
  eventId,
  open,
  onOpenChange,
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [sourceId, setSourceId] = useState('')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const copy = useCopyParticipants(eventId)

  const eventsQuery = useQuery({
    queryKey: ['admin-events', 'copy-source'],
    queryFn: () => unwrap(api.GET('/admin/events', { params: { query: { page_size: 100 } } })),
    enabled: open,
  })

  const sourceParticipants = useQuery({
    queryKey: ['participants', sourceId, { include_removed: false }],
    queryFn: () =>
      unwrap(
        api.GET('/admin/events/{id}/participants', {
          params: { path: { id: sourceId }, query: { page_size: 100 } },
        }),
      ),
    enabled: open && sourceId.length > 0,
  })

  async function submit() {
    if (!sourceId) return
    try {
      const result = await copy.mutateAsync({
        source_event_id: sourceId,
        overrides: Object.entries(overrides).map(([user_id, team_role]) => ({
          user_id,
          team_role,
        })),
      })
      reportBatchResult(result, 'Состав скопирован')
      onOpenChange(false)
      setSourceId('')
      setOverrides({})
    } catch {
      toast.error('Не удалось скопировать состав')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Копирование состава</DialogTitle>
          <DialogDescription>
            Уже назначенные участники пропускаются и попадают в отчёт об операции.
          </DialogDescription>
        </DialogHeader>

        <Field label="Исходное событие" htmlFor="copy-source">
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger id="copy-source">
              <SelectValue placeholder="Выберите событие" />
            </SelectTrigger>
            <SelectContent>
              {(eventsQuery.data?.items ?? [])
                .filter((item) => item.id !== eventId)
                .map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>

        {sourceParticipants.isPending && sourceId && <LoadingState />}

        {sourceParticipants.data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Участник</TableHead>
                <TableHead className="w-56">Роль в новом событии</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceParticipants.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.user.display_name}</span>
                    <span className="ml-2 text-muted-foreground">{item.user.email}</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`Роль для ${item.user.display_name}`}
                      value={overrides[item.user.id] ?? item.team_role}
                      onChange={(event) =>
                        setOverrides((previous) => ({
                          ...previous,
                          [item.user.id]: event.target.value,
                        }))
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={!sourceId || copy.isPending}>
            Скопировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
