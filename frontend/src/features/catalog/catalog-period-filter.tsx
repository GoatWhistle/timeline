import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/forms/input'
import { Button } from '@/shared/ui/primitives/button'

export function CatalogPeriodFilter({
  from,
  to,
  onFrom,
  onTo,
  onClear,
}: {
  from: string
  to: string
  onFrom: (value: string) => void
  onTo: (value: string) => void
  onClear: () => void
}) {
  const { t } = useTranslation('event')
  const active = from !== '' || to !== ''

  return (
    <fieldset className="flex items-center gap-1 rounded-md border border-border px-1">
      <legend className="sr-only">{t('catalog.periodAria')}</legend>
      <span className="pl-1 text-meta text-muted-foreground">{t('catalog.period.from')}</span>
      <Input
        type="date"
        value={from}
        max={to === '' ? undefined : to}
        aria-label={t('catalog.period.fromAria')}
        onChange={(e) => onFrom(e.target.value)}
        className="h-7 w-[8.5rem] border-0 bg-transparent px-1 shadow-none"
      />
      <span className="text-meta text-muted-foreground">{t('catalog.period.to')}</span>
      <Input
        type="date"
        value={to}
        min={from === '' ? undefined : from}
        aria-label={t('catalog.period.toAria')}
        onChange={(e) => onTo(e.target.value)}
        className="h-7 w-[8.5rem] border-0 bg-transparent px-1 shadow-none"
      />
      {active && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('catalog.period.clear')}
          onClick={onClear}
          className="size-7 shrink-0 p-0"
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      )}
    </fieldset>
  )
}
