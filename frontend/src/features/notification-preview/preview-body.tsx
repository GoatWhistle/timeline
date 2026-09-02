import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CHANNEL_KEY, NOTIFICATION_TYPE_KEY } from '@/entities/notification/notification.labels'
import type { PreviewState } from '@/entities/notification-preview'
import type { NotificationPreviewResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { PreviewFigure } from '@/shared/ui/data-display/empty-figures/system-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { Skeleton } from '@/shared/ui/states'

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-40 shrink-0 text-meta text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-copy">{value}</dd>
    </div>
  )
}

function ChannelNotice({ ready, channel }: { ready: boolean; channel: string }) {
  const { t } = useTranslation('notification')
  const Icon = ready ? CircleCheck : TriangleAlert

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-control border px-3 py-2',
        ready ? 'border-border bg-surface-2' : 'border-destructive/40 bg-destructive/5',
      )}
      data-ready={ready ? 'yes' : 'no'}
      role={ready ? undefined : 'status'}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium text-copy">
          {ready ? t('preview.channelReady') : t('preview.channelNotReady')}
          {ready ? ` — ${channel}` : ''}
        </p>
        {ready ? null : (
          <p className="mt-0.5 text-meta text-muted-foreground">
            {t('preview.channelNotReadyHint')}
          </p>
        )}
      </div>
    </div>
  )
}

function Rendered({ preview }: { preview: NotificationPreviewResponse }) {
  const { t } = useTranslation('notification')

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 rounded-control border border-border bg-surface-2 px-3 py-2 text-meta text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t('preview.noSideEffects')}
      </p>

      <ChannelNotice
        ready={preview.channel_ready === true}
        channel={preview.channel ? t(CHANNEL_KEY[preview.channel]) : ''}
      />

      <div className="rounded-control border border-border">
        <p className="border-border border-b px-3 py-2 font-medium text-copy">
          {preview.subject || '—'}
        </p>
        <p className="whitespace-pre-wrap px-3 py-3 text-copy">{preview.body || '—'}</p>
      </div>

      <dl className="divide-y divide-border">
        {preview.type ? (
          <Line label={t('preview.rule')} value={t(NOTIFICATION_TYPE_KEY[preview.type])} />
        ) : null}
        <Line label={t('preview.scheduledAt')} value={formatDateTime(preview.scheduled_at)} />
        <Line
          label={t('preview.deadline')}
          value={preview.deadline_local || formatDateTime(preview.deadline_utc)}
        />
        <Line label={t('preview.language')} value={preview.language ?? '—'} />
        <Line label={t('preview.timezone')} value={preview.timezone_id ?? '—'} />
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
