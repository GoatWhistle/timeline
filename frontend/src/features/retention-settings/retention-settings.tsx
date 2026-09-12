import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  retentionSettingsQuery,
  useUpdateRetentionSettings,
} from '@/entities/retention/retention.queries'
import { formatDateTime } from '@/shared/datetime/datetime'
import { Card, CardContent } from '@/shared/ui/layout/card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { PAGE_WIDTH } from '@/shared/ui/layout/page-width'
import { QueryBoundary, SkeletonDetail } from '@/shared/ui/states'
import { RetentionSettingsForm } from './retention-settings-form'

export function AdminRetentionPage() {
  const { t } = useTranslation()
  const query = useQuery(retentionSettingsQuery())
  const update = useUpdateRetentionSettings()
  const settings = query.data

  return (
    <div className={PAGE_WIDTH}>
      <PageHeader title={t('retention.title')} description={t('retention.description')} />

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={settings !== undefined}
        skeleton={<SkeletonDetail />}
      >
        {settings && (
          <Card>
            <CardContent className="flex flex-col gap-6">
              <RetentionSettingsForm
                settings={settings}
                onSubmit={async (payload) => {
                  await update.mutateAsync(payload)
                  toast.success(t('retention.saved'))
                }}
              />
              {settings.updated_by && (
                <p className="text-meta text-muted-foreground">
                  {t('retention.lastChangedBy', {
                    user: settings.updated_by,
                    date: formatDateTime(settings.updated_at),
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </QueryBoundary>
    </div>
  )
}
