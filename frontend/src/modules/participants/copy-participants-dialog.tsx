import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api, unwrap } from '@/shared/api/client'
import { reportBatchResult } from '@/shared/lib/batch'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { LoadingState } from '@/shared/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { useCopyParticipants } from './api'

/**
 * Копирование состава. Переносится только ASSIGNED; роль подставляется из
 * исходного хакатона и может быть изменена до сохранения (раздел 12 ТЗ).
 */
export function CopyParticipantsDialog({
  hackathonId,
  open,
  onOpenChange,
}: {
  hackathonId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [sourceId, setSourceId] = useState('')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const copy = useCopyParticipants(hackathonId)

  const hackathonsQuery = useQuery({
    queryKey: ['admin-hackathons', 'copy-source'],
    queryFn: () => unwrap(api.GET('/admin/hackathons', { params: { query: { page_size: 100 } } })),
    enabled: open,
  })

  const sourceParticipants = useQuery({
    queryKey: ['participants', sourceId, { include_removed: false }],
    queryFn: () =>
      unwrap(
        api.GET('/admin/hackathons/{id}/participants', {
          params: { path: { id: sourceId }, query: { page_size: 100 } },
        }),
      ),
    enabled: open && sourceId.length > 0,
  })

  async function submit() {
    if (!sourceId) return
    try {
      const result = await copy.mutateAsync({
        source_hackathon_id: sourceId,
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

        <Field label="Исходный хакатон" htmlFor="copy-source">
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger id="copy-source">
              <SelectValue placeholder="Выберите хакатон" />
            </SelectTrigger>
            <SelectContent>
              {(hackathonsQuery.data?.items ?? [])
                .filter((item) => item.id !== hackathonId)
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
                <TableHead className="w-56">Роль в новом хакатоне</TableHead>
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
