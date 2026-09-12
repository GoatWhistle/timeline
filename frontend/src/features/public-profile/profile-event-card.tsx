import { PinOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PrizeMark } from '@/entities/prize/prize-mark'
import type { PublicProfileEvent } from '@/shared/api/types.gen'
import { formatDateRange } from '@/shared/datetime/datetime'
import { formatAmount } from '@/shared/money/money'
import { cn } from '@/shared/styling/class-names/class-names'
import { Card, CardContent } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

export function ProfileEventCard({
  event,
  onUnpin,
  className,
}: {
  event: PublicProfileEvent
  onUnpin?: (event: PublicProfileEvent) => void
  className?: string
}) {
  const { t } = useTranslation(['common', 'event'])

  return (
    <Card className={cn('relative flex flex-col gap-2 p-4', className)}>
      {onUnpin && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('publicProfile.pinned.unpinAria', { title: event.title })}
          onClick={() => onUnpin(event)}
          className="absolute top-2 right-2 size-7"
        >
          <PinOff className="size-3.5" aria-hidden="true" />
        </Button>
      )}
      <CardContent className="flex flex-col gap-2 p-0 pr-8">
        <span className="text-caption text-muted-foreground">
          {t(`catalog.kindLabel.${event.kind}`, { ns: 'event' })}
        </span>
        <Link
          to={`/events/${event.id}`}
          className="font-medium text-copy underline-offset-2 hover:underline"
        >
          {event.title}
        </Link>
        <span className="text-caption text-muted-foreground">
          {formatDateRange(event.start_at, event.end_at)}
        </span>
        {event.team_name && (
          <span className="text-caption text-muted-foreground">
            {t('publicProfile.timeline.team', { name: event.team_name })}
          </span>
        )}
        {event.outcome && (event.outcome.place !== undefined || event.outcome.amount) && (
          <PrizeMark
            place={event.outcome.place}
            title={
              event.outcome.amount ? (formatAmount(event.outcome.amount) ?? undefined) : undefined
            }
          />
        )}
      </CardContent>
    </Card>
  )
}
