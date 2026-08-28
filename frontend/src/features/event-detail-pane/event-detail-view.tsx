import { ExternalLink, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { resolveUrgency, URGENCY_KEY, URGENCY_TEXT } from '@/entities/deadline/urgency/urgency'
import { EventStateBadge } from '@/entities/event/event-state-badge'
import type { EventState } from '@/shared/api/types.gen'
import { formatDateRange, formatEventMoment, formatRelative } from '@/shared/datetime/datetime'
import { Button } from '@/shared/ui/primitives/button'

export type DetailEvent = {
  id: string
  title: string
  organizer?: string | null
  start_at: string
  end_at: string
  state: EventState
  website_url?: string | null
}

export type DetailRegistration = {
  deadline_at?: string | null
  url?: string | null
  state?: string | null
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-medium text-caption text-muted-foreground uppercase tracking-wide">
      {children}
    </h3>
  )
}

export function EventDetailView({
  event,
  registration,
  status,
  detailPath,
  onClose,
  children,
}: {
  event: DetailEvent
  registration?: DetailRegistration | null
  status?: 'TODO' | 'DONE' | 'NOT_REQUIRED' | null
  detailPath: string
  onClose: () => void
  children?: ReactNode
}) {
  const { t } = useTranslation('event')
  const urgency = resolveUrgency({ deadlineAt: registration?.deadline_at, status })

  return (
    <div>
      <header className="flex items-start gap-2 border-border border-b p-4">
        <div className="min-w-0 flex-1">
          <p className="text-copy text-muted-foreground">
            {formatDateRange(event.start_at, event.end_at)}
          </p>
          <h2 id="event-detail-title" className="mt-1 font-semibold text-heading">
            {event.title}
          </h2>
          {event.organizer && (
            <p className="mt-1 text-meta text-muted-foreground">{event.organizer}</p>
          )}
          <div className="mt-2">
            <EventStateBadge state={event.state} />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('detail.close')}>
          <X className="size-4" aria-hidden="true" />
        </Button>
      </header>

      <div className="flex flex-col gap-5 p-4">
        {registration?.deadline_at && (
          <section className="flex flex-col gap-1.5">
            <SectionTitle>{t('detail.registration')}</SectionTitle>
            <p className={`text-copy ${URGENCY_TEXT[urgency]}`}>
              {formatEventMoment(registration.deadline_at)}
            </p>
            <p className="text-meta text-muted-foreground">
              {formatRelative(registration.deadline_at)} ·{' '}
              {t(URGENCY_KEY[urgency].replace('event:', ''))}
            </p>
          </section>
        )}

        {children}

        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={detailPath}>{t('detail.openFull')}</Link>
          </Button>
          {event.website_url && (
            <Button asChild variant="ghost" size="sm">
              <a href={event.website_url} target="_blank" rel="noopener noreferrer">
                {t('card.website')}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
