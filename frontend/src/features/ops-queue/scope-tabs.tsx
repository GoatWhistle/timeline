import { useTranslation } from 'react-i18next'
import type { QueueScope } from '@/entities/ops'
import { Segmented } from '@/shared/ui/navigation/segmented'

const SCOPES: { value: QueueScope; labelKey: string }[] = [
  { value: 'failures', labelKey: 'ops:scope.failures' },
  { value: 'stuck-leases', labelKey: 'ops:scope.stuckLeases' },
]

export function ScopeTabs({
  value,
  onChange,
}: {
  value: QueueScope
  onChange: (scope: QueueScope) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="mb-4">
      <Segmented
        value={value}
        onChange={onChange}
        label={t('ops:scope.label')}
        options={SCOPES.map(({ value: scope, labelKey }) => ({
          value: scope,
          label: t(labelKey),
        }))}
      />
    </div>
  )
}
