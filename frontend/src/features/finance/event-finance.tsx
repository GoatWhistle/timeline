import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useSession } from '@/shared/api/session'
import type { EventCaseResponse, EventFinanceResponse } from '@/shared/api/types.gen'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'
import { useFinanceExport } from './finance.export'
import { eventCasesQuery, eventFinanceQuery } from './finance.queries'
import { FinanceCases } from './finance-cases'
import { FinanceReconciliation } from './finance-reconciliation'
import { FinanceTracks } from './finance-tracks'

export function EventFinance({
  eventId,
  finance,
  cases,
  canEdit,
}: {
  eventId: string
  finance: EventFinanceResponse
  cases: EventCaseResponse[]
  canEdit: boolean
}) {
  const { t } = useTranslation('event')
  const exportMutation = useFinanceExport()
  const currency = finance.prize_currency ?? undefined

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>{t('finance.title')}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          disabled={exportMutation.isPending}
          onClick={() =>
            exportMutation.mutate(eventId, {
              onSuccess: () => toast.success(t('finance.exportDone')),
              onError: () => toast.error(t('finance.exportFailed')),
            })
          }
        >
          <Download className="size-4" aria-hidden="true" />
          {t('finance.export')}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <FinanceReconciliation finance={finance} />
        <FinanceTracks tracks={finance.tracks} currency={currency} />
        <FinanceCases
          eventId={eventId}
          cases={cases}
          tracks={finance.tracks}
          currency={currency}
          canEdit={canEdit}
        />
      </CardContent>
    </Card>
  )
}

export function EventFinanceSection({ eventId }: { eventId: string }) {
  const { isAdmin } = useSession()
  const finance = useQuery(eventFinanceQuery(eventId))
  const cases = useQuery(eventCasesQuery(eventId))

  const data = finance.data
  if (!data) return null

  const items = cases.data?.items ?? []
  const empty =
    !data.discrepancy_known && data.tracks.length === 0 && items.length === 0 && !isAdmin
  if (empty) return null

  return <EventFinance eventId={eventId} finance={data} cases={items} canEdit={isAdmin} />
}
