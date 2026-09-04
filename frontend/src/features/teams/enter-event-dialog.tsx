import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { catalogQuery } from '@/entities/catalog/catalog.queries'
import { teamEventsQuery, useEnterEvent } from '@/entities/team/team.queries'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { cn } from '@/shared/styling/class-names/class-names'
import { Input } from '@/shared/ui/forms/input'
import { Label } from '@/shared/ui/forms/label'
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
import { QueryBoundary } from '@/shared/ui/states'

export function EnterEventDialog({
  teamId,
  open,
  onOpenChange,
}: {
  teamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('team')
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const enter = useEnterEvent(teamId)

  const query = useQuery({
    ...catalogQuery({ kind: 'HACKATHON', ...(debounced ? { search: debounced } : {}) }),
    enabled: open,
  })
  const entered = useQuery(teamEventsQuery(teamId))

  const enteredIds = new Set((entered.data?.items ?? []).map((entry) => entry.event_id))

  async function submit(eventId: string) {
    try {
      await enter.mutateAsync({ event_id: eventId })
      toast.success(t('entered'))
      onOpenChange(false)
    } catch {
      toast.error(t('enterFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('enterTitle')}</DialogTitle>
          <DialogDescription>{t('enterHint')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="team-event-search">{t('eventLabel')}</Label>
          <Input
            id="team-event-search"
            placeholder={t('eventPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <QueryBoundary
          isPending={query.isPending}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          hasData={query.data !== undefined}
          shape="unknown"
        >
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {(query.data?.items ?? []).map((item) => {
              const already = enteredIds.has(item.id)
              return (
                <li key={item.id}>
                  <Button
                    variant="ghost"
                    aria-disabled={already || undefined}
                    disabled={enter.isPending}
                    onClick={() => {
                      if (already) return
                      submit(item.id)
                    }}
                    className={cn(
                      'h-auto w-full justify-start gap-2 py-2 text-left',
                      already && 'cursor-not-allowed opacity-60 hover:bg-transparent',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    {already && (
                      <Badge tone="outline" className="shrink-0">
                        {t('alreadyEntered')}
                      </Badge>
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        </QueryBoundary>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:action.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
