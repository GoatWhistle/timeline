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
  type CatalogScope,
  type CatalogStateFilter,
} from '@/entities/catalog/catalog.views'
import { Input } from '@/shared/ui/forms/input'
import { Segmented } from '@/shared/ui/navigation/segmented'

export function CatalogToolbar({
  search,
  scope,
  kind,
  state,
  format,
  layout,
  onSearch,
  onScope,
  onKind,
  onState,
  onFormat,
  onLayout,
}: {
  search: string
  scope: CatalogScope
  kind: CatalogKindFilter
  state: CatalogStateFilter
  format: CatalogFormatFilter
  layout: CatalogLayout
  onSearch: (value: string) => void
  onScope: (value: CatalogScope) => void
  onKind: (value: CatalogKindFilter) => void
  onState: (value: CatalogStateFilter) => void
  onFormat: (value: CatalogFormatFilter) => void
  onLayout: (value: CatalogLayout) => void
}) {
  const { t } = useTranslation('event')

  return (
    <div className="flex flex-wrap items-center gap-2 border-border border-b px-4 py-3">
      <h1 className="mr-2 font-semibold text-screen tracking-tight">{t('catalog.title')}</h1>

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

      <Segmented
        className="ml-auto"
        label={t('catalog.layoutAria')}
        value={layout}
        onChange={onLayout}
        options={CATALOG_LAYOUTS.map((value) => ({ value, label: t(`catalog.layout.${value}`) }))}
      />
    </div>
  )
}
