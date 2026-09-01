import { useTranslation } from 'react-i18next'
import {
  CATALOG_FORMAT_KEY,
  CATALOG_FORMATS,
  CATALOG_KIND_KEY,
  CATALOG_KINDS,
  CATALOG_LAYOUTS,
  CATALOG_SCOPE_KEY,
  CATALOG_SCOPES,
  CATALOG_STATE_KEY,
  CATALOG_STATES,
  type CatalogFormatFilter,
  type CatalogKindFilter,
  type CatalogLayout,
  type CatalogOrder,
  type CatalogScope,
  type CatalogSort,
  type CatalogStateFilter,
} from '@/entities/catalog/catalog.views'
import { Input } from '@/shared/ui/forms/input'
import { Segmented } from '@/shared/ui/navigation/segmented'
import { CatalogPeriodFilter } from './catalog-period-filter'
import { CatalogExportButton, CatalogSortControl } from './catalog-sort-control'

export type CatalogToolbarProps = {
  search: string
  scope: CatalogScope
  kind: CatalogKindFilter
  state: CatalogStateFilter
  format: CatalogFormatFilter
  layout: CatalogLayout
  sort: CatalogSort
  order: CatalogOrder
  from: string
  to: string
  total: number | undefined
  exporting: boolean
  onSearch: (value: string) => void
  onScope: (value: CatalogScope) => void
  onKind: (value: CatalogKindFilter) => void
  onState: (value: CatalogStateFilter) => void
  onFormat: (value: CatalogFormatFilter) => void
  onLayout: (value: CatalogLayout) => void
  onSort: (value: CatalogSort) => void
  onOrder: (value: CatalogOrder) => void
  onFrom: (value: string) => void
  onTo: (value: string) => void
  onClearPeriod: () => void
  onExport: () => void
}

export function CatalogToolbar({
  search,
  scope,
  kind,
  state,
  format,
  layout,
  sort,
  order,
  from,
  to,
  total,
  exporting,
  onSearch,
  onScope,
  onKind,
  onState,
  onFormat,
  onLayout,
  onSort,
  onOrder,
  onFrom,
  onTo,
  onClearPeriod,
  onExport,
}: CatalogToolbarProps) {
  const { t } = useTranslation('event')

  return (
    <div className="flex flex-col gap-2 border-border border-b px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-1 font-semibold text-screen tracking-tight">{t('catalog.title')}</h1>

        <Input
          value={search}
          aria-label={t('list.searchAria')}
          placeholder={t('list.searchPlaceholder')}
          onChange={(e) => onSearch(e.target.value)}
          className="h-9 w-48"
        />

        <Segmented
          label={t('catalog.scopeAria')}
          value={scope}
          onChange={onScope}
          options={CATALOG_SCOPES.map((value) => ({ value, label: t(CATALOG_SCOPE_KEY[value]) }))}
        />

        <Segmented
          label={t('catalog.kindAria')}
          value={kind}
          onChange={onKind}
          options={CATALOG_KINDS.map((value) => ({ value, label: t(CATALOG_KIND_KEY[value]) }))}
        />

        <Segmented
          label={t('catalog.stateAria')}
          value={state}
          onChange={onState}
          options={CATALOG_STATES.map((value) => ({ value, label: t(CATALOG_STATE_KEY[value]) }))}
        />

        <Segmented
          label={t('catalog.formatAria')}
          value={format}
          onChange={onFormat}
          options={CATALOG_FORMATS.map((value) => ({ value, label: t(CATALOG_FORMAT_KEY[value]) }))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CatalogPeriodFilter
          from={from}
          to={to}
          onFrom={onFrom}
          onTo={onTo}
          onClear={onClearPeriod}
        />

        <CatalogSortControl sort={sort} order={order} onSort={onSort} onOrder={onOrder} />

        <CatalogExportButton pending={exporting} onExport={onExport} />

        {total !== undefined && (
          <span aria-live="polite" className="text-meta text-muted-foreground tabular-nums">
            {t('catalog.resultCount', { count: total })}
          </span>
        )}

        <Segmented
          className="ml-auto"
          label={t('catalog.layoutAria')}
          value={layout}
          onChange={onLayout}
          options={CATALOG_LAYOUTS.map((value) => ({ value, label: t(`catalog.layout.${value}`) }))}
        />
      </div>
    </div>
  )
}
