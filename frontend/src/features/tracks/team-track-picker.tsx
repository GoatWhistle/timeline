import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { failureMessage } from '@/shared/api/failure'
import type { TeamEventEntryResponse } from '@/shared/api/types.gen'
import { Label } from '@/shared/ui/forms/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Badge } from '@/shared/ui/primitives/badge'
import { useChooseTrack } from './track.queries'

const NONE = 'none'

export function TeamTrackPicker({
  teamId,
  entry,
  isLead,
}: {
  teamId: string
  entry: TeamEventEntryResponse
  isLead: boolean
}) {
  const { t } = useTranslation('team')
  const choose = useChooseTrack(teamId, entry.event_id)

  const tracks = entry.tracks ?? []
  if (tracks.length === 0) return null

  const chosen = entry.track
  const selectId = `team-track-${entry.id}`
  const locked = entry.track_locked === true
  const readOnly = locked || !isLead

  async function pick(value: string) {
    try {
      await choose.mutateAsync(value === NONE ? {} : { track_id: value })
      toast.success(t('track.saved'))
    } catch (error) {
      toast.error(failureMessage(error))
    }
  }

  return (
    <section className="flex flex-col gap-2" aria-label={t('track.title')}>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={readOnly ? undefined : selectId}>{t('track.title')}</Label>
        {locked && (
          <Badge tone="neutral" className="gap-1">
            <Lock className="size-3" aria-hidden="true" />
            {t('track.locked')}
          </Badge>
        )}
      </div>

      {readOnly ? (
        <p className="text-copy" id={selectId}>
          {chosen ? chosen.name : t('track.none')}
        </p>
      ) : (
        <Select value={chosen ? chosen.id : NONE} onValueChange={pick} disabled={choose.isPending}>
          <SelectTrigger id={selectId} className="w-full sm:max-w-sm">
            <SelectValue placeholder={t('track.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t('track.none')}</SelectItem>
            {tracks.map((track) => (
              <SelectItem key={track.id} value={track.id}>
                {track.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <p className="text-meta text-muted-foreground">
        {t(locked ? 'track.lockedHint' : 'track.hint')}
      </p>
    </section>
  )
}
