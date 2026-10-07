import { ListChecks } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CARD_FIELD_KEY,
  CARD_FIELDS,
  type CardField,
  DEFAULT_CARD_FIELDS,
} from '@/entities/catalog/card-fields'
import { useExitPresence } from '@/shared/hooks/use-exit-presence/use-exit-presence'
import { cn } from '@/shared/styling/class-names/class-names'
import { CatalogColumnsMenu } from './catalog-columns-menu'

export function CardFieldsMenu({
  fields,
  onToggle,
  onReset,
}: {
  fields: CardField[]
  onToggle: (field: CardField) => void
  onReset: () => void
}) {
  const { t } = useTranslation('event')

  return (
    <CatalogColumnsMenu<CardField>
      kind="fields"
      heading={t('catalog.columns.fields')}
      icon={ListChecks}
      columns={fields}
      onToggle={onToggle}
      onReset={onReset}
      all={CARD_FIELDS}
      labels={CARD_FIELD_KEY}
      locked={null}
      defaults={DEFAULT_CARD_FIELDS}
    />
  )
}

export function GridSortSlot({ show, children }: { show: boolean; children: ReactNode }) {
  const { rendered, leaving } = useExitPresence(show)
  if (!rendered) return null

  return (
    <span
      data-sort-slot=""
      data-leaving={leaving || undefined}
      aria-hidden={leaving || undefined}
      inert={leaving || undefined}
      className={cn(
        'flex',
        leaving
          ? 'pointer-events-none motion-safe:animate-tool-out'
          : 'motion-safe:animate-tool-in',
      )}
    >
      {children}
    </span>
  )
}
