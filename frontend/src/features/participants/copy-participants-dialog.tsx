import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCopyParticipants } from '@/entities/participant/participant.queries'
import { reportBatchResult } from '@/shared/api/batch-result/batch-result'
import { api, unwrap } from '@/shared/api/client'
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
import { QueryBoundary } from '@/shared/ui/states'

export function CopyParticipantsDialog({
  eventId,
  open,
  onOpenChange,
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('registration')
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
      reportBatchResult(result, t('participants.copied'))
      onOpenChange(false)
      setSourceId('')
      setOverrides({})
    } catch {
      toast.error(t('participants.copyFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('participants.copyTitle')}</DialogTitle>
          <DialogDescription>{t('participants.copyHint')}</DialogDescription>
        </DialogHeader>

        <Field label={t('participants.copySource')} htmlFor="copy-source">
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger id="copy-source">
              <SelectValue placeholder={t('participants.copySourcePlaceholder')} />
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

        {sourceId.length > 0 && (
          <QueryBoundary
            isPending={sourceParticipants.isPending}
            isFetching={sourceParticipants.isFetching}
            isError={sourceParticipants.isError}
            error={sourceParticipants.error}
            onRetry={() => sourceParticipants.refetch()}
            hasData={sourceParticipants.data !== undefined}
            shape="unknown"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('participants.columnParticipant')}</TableHead>
                  <TableHead className="w-56">{t('participants.columnNewRole')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sourceParticipants.data?.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-medium">{item.user.display_name}</span>
                      <span className="ml-2 text-muted-foreground">{item.user.email}</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={t('participants.roleFor', { name: item.user.display_name })}
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
          </QueryBoundary>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:action.cancel')}
          </Button>
          <Button onClick={submit} disabled={!sourceId || copy.isPending}>
            {t('participants.copySubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
