import { useTranslation } from 'react-i18next'
import { auditActionKey, entityTypeKey } from '@/entities/audit/audit.labels'
import type { AuditResponse } from '@/shared/api/types.gen'
import { GroupLabel } from '@/shared/ui/data-display/group-label/group-label'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'

function DiffBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0 flex-1">
      <GroupLabel as="p" className="mb-1">
        {title}
      </GroupLabel>
      <pre className="overflow-x-auto rounded-control bg-muted p-3 text-caption">
        {value === undefined || value === null ? <NoValue /> : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

export function AuditDetailDialog({
  detail,
  onClose,
}: {
  detail: AuditResponse | null
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={detail !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{detail ? t(auditActionKey(detail.action)) : t('audit.record')}</DialogTitle>
        </DialogHeader>
        {detail && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-copy">
              <div>
                <dt className="text-muted-foreground">{t('audit.columnActor')}</dt>
                <dd>{detail.actor_email ?? t('audit.system')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('audit.requestId')}</dt>
                <dd className="font-mono text-caption">{detail.request_id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('audit.columnEntity')}</dt>
                <dd>{t(entityTypeKey(detail.entity_type))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('audit.entityId')}</dt>
                <dd className="font-mono text-caption">{detail.entity_id}</dd>
              </div>
            </dl>
            <div className="flex gap-4">
              <DiffBlock title={t('audit.before')} value={detail.before} />
              <DiffBlock title={t('audit.after')} value={detail.after} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
