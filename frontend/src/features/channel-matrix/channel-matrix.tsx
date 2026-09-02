import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  buildMatrix,
  type CellState,
  countByChannel,
  DELIVERY_CHANNELS,
} from '@/entities/channel-matrix'
import { CHANNEL_KEY } from '@/entities/notification/notification.labels'
import { rulesQuery } from '@/entities/registration/registration.queries'
import { useSession } from '@/shared/api/session'
import { formatOffsetMinutes } from '@/shared/datetime/datetime'
import { MatrixFigure } from '@/shared/ui/data-display/empty-figures/system-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'
import { MatrixCell } from './matrix-cell'

const LEGEND: CellState[] = ['chosen', 'fallback', 'off', 'mirror']

export function ChannelMatrix({ eventId }: { eventId: string }) {
  const { t } = useTranslation('notification')
  const { user } = useSession()
  const query = useQuery(rulesQuery(eventId))

  const rows = buildMatrix(query.data ?? [], user?.preferred_channel)
  const totals = countByChannel(rows)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-heading">{t('matrix.title')}</h3>
        <p className="mt-1 max-w-prose text-meta text-muted-foreground">{t('matrix.hint')}</p>
      </div>

      <p className="flex items-start gap-2 rounded-control border border-border bg-surface-2 px-3 py-2 text-meta">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0">
          <span className="font-medium text-copy">{t('matrix.inAppTitle')}</span>
          <span className="mt-0.5 block text-muted-foreground">{t('matrix.inAppHint')}</span>
        </span>
      </p>

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={<SkeletonTable rows={4} columns={4} density="action" />}
      >
        {rows.length === 0 ? (
          <EmptyState
            title={t('matrix.emptyTitle')}
            description={t('matrix.emptyHint')}
            figure={MatrixFigure}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('matrix.columnRule')}</TableHead>
                  {DELIVERY_CHANNELS.map((channel) => (
                    <TableHead key={channel} className="w-32 text-center">
                      {t(CHANNEL_KEY[channel])}
                    </TableHead>
                  ))}
                  <TableHead className="w-36 text-center text-muted-foreground">
                    {t('matrix.columnInApp')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.ruleId} data-enabled={row.enabled ? 'yes' : 'no'}>
                    <TableCell>
                      <span className="text-copy">{formatOffsetMinutes(row.offsetMinutes)}</span>
                      {row.enabled ? null : (
                        <span className="ml-2 text-meta text-muted-foreground">
                          {t('matrix.disabledRow')}
                        </span>
                      )}
                    </TableCell>
                    {DELIVERY_CHANNELS.map((channel) => (
                      <TableCell key={channel} className="text-center">
                        <MatrixCell state={row.cells[channel]} />
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <MatrixCell state={row.mirror} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-meta text-muted-foreground">{t('matrix.legend')}</span>
              {LEGEND.map((state) => (
                <span key={state} className="inline-flex items-center gap-1.5">
                  <MatrixCell state={state} />
                  <span className="text-meta text-muted-foreground">
                    {t(`matrix.cell_${state}`)}
                  </span>
                </span>
              ))}
            </div>

            <p className="text-meta text-muted-foreground">
              {t('matrix.totals', { telegram: totals.TELEGRAM, email: totals.EMAIL })}
            </p>
          </>
        )}
      </QueryBoundary>
    </div>
  )
}
