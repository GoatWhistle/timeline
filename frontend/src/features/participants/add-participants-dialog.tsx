import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAddParticipants } from '@/entities/participant/participant.queries'
import { reportBatchResult } from '@/shared/api/batch-result/batch-result'
import { usersQuery } from '@/shared/api/directory'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Input } from '@/shared/ui/forms/input'
import { Label } from '@/shared/ui/forms/label'
import { Pagination } from '@/shared/ui/navigation/pagination'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'

export function AddParticipantsDialog({
  eventId,
  open,
  onOpenChange,
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Map<string, string>>(new Map())
  const debounced = useDebouncedValue(search, 300)

  const query = useQuery({
    ...usersQuery({ page, ...(debounced ? { query: debounced } : {}) }),
    enabled: open,
  })
  const add = useAddParticipants(eventId)

  function toggle(userId: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Map(previous)
      if (checked) next.set(userId, next.get(userId) ?? 'Участник')
      else next.delete(userId)
      return next
    })
  }

  function setRole(userId: string, role: string) {
    setSelected((previous) => new Map(previous).set(userId, role))
  }

  async function submit() {
    const items = [...selected.entries()].map(([user_id, team_role]) => ({ user_id, team_role }))
    if (items.length === 0) return
    try {
      const result = await add.mutateAsync({ items })
      reportBatchResult(result, 'Участники добавлены')
      setSelected(new Map())
      onOpenChange(false)
    } catch {
      toast.error('Не удалось добавить участников')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Добавление участников</DialogTitle>
          <DialogDescription>
            Выберите зарегистрированных пользователей и задайте роль каждому. Деактивированных
            добавить нельзя.
          </DialogDescription>
        </DialogHeader>

        <Input
          aria-label="Поиск пользователей"
          placeholder="Поиск по имени или email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />

        {query.isPending && <LoadingState />}

        {query.data && (
          <div className="flex flex-col gap-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Состояние</TableHead>
                  <TableHead className="w-56">Роль в команде</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((item) => {
                  const checked = selected.has(item.id)
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          id={`user-${item.id}`}
                          checked={checked}
                          disabled={!item.is_active}
                          onCheckedChange={(value) => toggle(item.id, value === true)}
                        />
                      </TableCell>
                      <TableCell>
                        <Label htmlFor={`user-${item.id}`} className="cursor-pointer">
                          <span className="font-medium">{item.display_name}</span>
                          <span className="ml-2 text-muted-foreground">{item.email}</span>
                        </Label>
                      </TableCell>
                      <TableCell>
                        {item.is_active ? (
                          <Badge tone="primary">активен</Badge>
                        ) : (
                          <Badge tone="danger">деактивирован</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Роль для ${item.display_name}`}
                          disabled={!checked}
                          value={selected.get(item.id) ?? ''}
                          onChange={(event) => setRole(item.id, event.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            <Pagination meta={query.data.meta} onPageChange={setPage} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={selected.size === 0 || add.isPending}>
            Добавить ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
