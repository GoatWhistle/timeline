import { CircleCheck } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { CHANNEL_KEY, NOTIFICATION_TYPE_KEY } from '@/entities/notification/notification.labels'
import type { PreviewState } from '@/entities/notification-preview'
import type { NotificationPreviewResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { PreviewFigure } from '@/shared/ui/data-display/empty-figures/system-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import { Note } from '@/shared/ui/data-display/note/note'
import { Skeleton } from '@/shared/ui/states'

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-40 shrink-0 text-meta text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-copy">{value}</dd>
    </div>
  )
}

function ChannelNotice({ ready, channels }: { ready: boolean; channels: string }) {
  const { t } = useTranslation('notification')

  return (
    <Note
      tone={ready ? 'neutral' : 'warning'}
      icon={ready ? CircleCheck : undefined}
      title={`${ready ? t('preview.channelReady') : t('preview.channelNotReady')}${
        ready ? ` — ${channels}` : ''
      }`}
      data-ready={ready ? 'yes' : 'no'}
      role={ready ? undefined : 'status'}
    >
      {ready ? undefined : t('preview.channelNotReadyHint')}
    </Note>
  )
}

function Rendered({ preview }: { preview: NotificationPreviewResponse }) {
  const { t } = useTranslation('notification')

  return (
    <div className="flex flex-col gap-4">
      <Note>{t('preview.noSideEffects')}</Note>

      <ChannelNotice
        ready={preview.channel_ready === true}
        channels={(preview.channels ?? []).map((channel) => t(CHANNEL_KEY[channel])).join(', ')}
      />

      <div className="rounded-control border border-border">
        <p className="border-border border-b px-3 py-2 font-medium text-copy">
          {preview.subject || <NoValue />}
        </p>
        <p className="whitespace-pre-wrap px-3 py-3 text-copy">{preview.body || <NoValue />}</p>
      </div>

      <dl className="divide-y divide-border">
        {preview.type ? (
          <Line label={t('preview.occasion')} value={t(NOTIFICATION_TYPE_KEY[preview.type])} />
        ) : null}
        {preview.days_before ? (
          <Line
            label={t('preview.daysBefore')}
            value={t('reminder.day', { count: preview.days_before })}
          />
        ) : null}
        <Line label={t('preview.scheduledAt')} value={formatDateTime(preview.scheduled_at)} />
        <Line
          label={t('preview.deadline')}
          value={preview.deadline_local || formatDateTime(preview.deadline_utc)}
        />
        <Line label={t('preview.language')} value={preview.language ?? <NoValue />} />
        <Line label={t('preview.timezone')} value={preview.timezone_id ?? <NoValue />} />
      </dl>
    </div>
  )
}

export function PreviewBody({ state, onRetry }: { state: PreviewState; onRetry: () => void }) {
  const { t } = useTranslation('notification')

  if (state.kind === 'idle') return null

  if (state.kind === 'loading') {
    return (
      <div className="flex flex-col gap-3" role="status" aria-busy="true">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (state.kind === 'nothing-to-send') {
    return (
      <EmptyState
        title={t('preview.nothingTitle')}
        description={t('preview.nothingHint')}
        figure={PreviewFigure}
      />
    )
  }

  if (state.kind === 'error') return <ErrorState error={state.error} onRetry={onRetry} />

  return <Rendered preview={state.preview} />
}
