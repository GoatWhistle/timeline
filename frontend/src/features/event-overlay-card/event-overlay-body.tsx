import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { resolveUrgency, URGENCY_KEY, URGENCY_TEXT } from '@/entities/deadline/urgency/urgency'
import { EventColorMark, eventColorAttrs } from '@/entities/event/event-color'
import { EventStateBadge } from '@/entities/event/event-state-badge'
import { StatusWithHint } from '@/entities/registration/status-hint/status-hint'
import { STAGE_TYPE_KEY } from '@/entities/stage/stage.labels'
import { StageTypeMark } from '@/entities/stage/stage-type-mark/stage-type-mark'
import { EventCover } from '@/features/event-cover'
import { PersonalSummary } from '@/features/personal-layer'
import { formatDateRange, formatEventMoment, formatRelative } from '@/shared/datetime/datetime'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import type { OverlayCard } from './overlay-model'
import { TeamProgressBar } from './team-progress/team-progress-bar'

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-medium text-caption text-muted-foreground uppercase tracking-wide">
      {children}
    </h3>
  )
}

export function EventOverlayBody({
  card,
  isAdmin,
  actions,
}: {
  card: OverlayCard
  isAdmin: boolean
  actions?: ReactNode
}) {
  const { t } = useTranslation('event')
  const urgency = resolveUrgency({ deadlineAt: card.deadlineAt, status: card.status })

  return (
    <div className="flex flex-col gap-5">
      <div {...eventColorAttrs(card.color)} className="flex flex-col gap-4">
        <EventCover
          coverUrl={card.coverUrl}
          title={card.title}
          className="aspect-[3/1] w-full border-event-tint"
        />

        <div className="flex flex-wrap items-center gap-2">
          <EventColorMark color={card.color} />
          <EventStateBadge state={card.state} />
          <Badge className="border-transparent bg-event-fill text-event-tint">
            {formatDateRange(card.startAt, card.endAt)}
          </Badge>
        </div>
      </div>

      {card.organizer && <p className="text-meta text-muted-foreground">{card.organizer}</p>}
      {card.description && <p className="text-copy">{card.description}</p>}

      {card.deadlineAt && (
        <section className="flex flex-col gap-1.5">
          <SectionTitle>{t('detail.registration')}</SectionTitle>
          <p className={`text-copy ${URGENCY_TEXT[urgency]}`}>
            {formatEventMoment(card.deadlineAt)}
          </p>
          <p className="text-meta text-muted-foreground">
            {formatRelative(card.deadlineAt)} · {t(URGENCY_KEY[urgency].replace('event:', ''))}
          </p>
        </section>
      )}

      {card.status && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>{t('detail.status')}</SectionTitle>
          <div>
            <StatusWithHint status={card.status} />
          </div>
          <TeamProgressBar eventId={card.id} enabled={isAdmin} />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <SectionTitle>{t('detail.stages')}</SectionTitle>
        {card.stages.length === 0 ? (
          <p className="text-meta text-muted-foreground">{t('card.noStages')}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {card.stages.map((stage) => (
              <li key={stage.id} className="flex items-start gap-2">
                <StageTypeMark type={stage.type} labelled={false} className="mt-0.5" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-copy">{stage.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-meta text-muted-foreground">
                    <Badge tone="neutral">{t(STAGE_TYPE_KEY[stage.type])}</Badge>
                    <span>{formatDateRange(stage.start_at, stage.end_at)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PersonalSummary eventId={card.id} enabled={card.joined} />

      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {card.joined && (
          <Button asChild>
            <Link to={`/events/${card.id}`}>{t('overlay.openFull')}</Link>
          </Button>
        )}
        {isAdmin && (
          <Button asChild variant="outline">
            <Link to={`/admin/events/${card.id}`}>{t('overlay.openAdmin')}</Link>
          </Button>
        )}
        {card.websiteUrl && (
          <Button asChild variant="ghost">
            <ExternalLink href={card.websiteUrl}>{t('card.website')}</ExternalLink>
          </Button>
        )}
      </div>
    </div>
  )
}
