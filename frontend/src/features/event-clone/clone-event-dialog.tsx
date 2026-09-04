import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { EventResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { DatePicker } from '@/shared/ui/forms/calendar/date-picker'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Label } from '@/shared/ui/forms/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'
import { shiftDaysBetween, shiftIso } from './shift-dates'
import { useCloneEvent } from './use-clone-event'

export function CloneEventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: EventResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('event')
  const navigate = useNavigate()
  const clone = useCloneEvent()

  const [title, setTitle] = useState(`${event.title ?? ''} ${t('clone.copySuffix')}`.trim())
  const [startInput, setStartInput] = useState(event.start_at?.slice(0, 10) ?? '')
  const [withStages, setWithStages] = useState(true)

  const days = shiftDaysBetween(event.start_at, startInput ? `${startInput}T00:00:00Z` : undefined)
  const shiftedEnd = shiftIso(event.end_at, days)

  async function submit() {
    try {
      const outcome = await clone.mutateAsync({ source: event, title, days, withStages })
      onOpenChange(false)
      toast.success(t('clone.done'), {
        description: t('clone.doneHint', {
          days,
          count: outcome.stagesCreated,
        }),
      })
      navigate(`/admin/events/${outcome.event.id}`)
    } catch {
      toast.error(t('clone.failed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('clone.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label={t('clone.newTitle')} htmlFor="clone-title">
            <Input id="clone-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <Field label={t('clone.newStart')} htmlFor="clone-start" hint={t('clone.startHint')}>
            <DatePicker id="clone-start" value={startInput} onChange={setStartInput} />
          </Field>

          <div className="flex items-center gap-2">
            <Checkbox
              id="clone-with-stages"
              checked={withStages}
              onCheckedChange={(checked) => setWithStages(checked === true)}
            />
            <Label htmlFor="clone-with-stages">{t('clone.withStages')}</Label>
          </div>

          <p className="rounded-control border border-border border-dashed p-3 text-meta text-muted-foreground">
            {days === 0
              ? t('clone.noShift')
              : t('clone.shiftSummary', {
                  days,
                  end: shiftedEnd ? formatDateTime(shiftedEnd) : t('common:state.dash'),
                })}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:action.cancel')}
          </Button>
          <Button onClick={submit} disabled={!title.trim() || clone.isPending}>
            {t('clone.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
