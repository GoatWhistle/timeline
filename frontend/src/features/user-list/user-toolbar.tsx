import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  USER_COLUMN_KEY,
  USER_COLUMNS,
  USER_LOCKED_COLUMN,
  type UserColumn,
} from '@/entities/user/user.views'
import { CatalogColumnsMenu } from '@/features/catalog/catalog-columns-menu'
import { Input } from '@/shared/ui/forms/input'
import { UserFiltersPopover, type UserFilterValues } from './user-filters-popover'

export function UserToolbar({
  filters,
  columns,
  searchValue,
  searchRef,
  onSearch,
  onFilters,
  onResetFilters,
  onToggleColumn,
  onResetColumns,
}: {
  filters: UserFilterValues
  columns: UserColumn[]
  searchValue: string
  searchRef: RefObject<HTMLInputElement | null>
  onSearch: (value: string) => void
  onFilters: (patch: UserFilterValues) => void
  onResetFilters: () => void
  onToggleColumn: (column: UserColumn) => void
  onResetColumns: () => void
}) {
  const { t } = useTranslation()

  return (
    <header className="flex flex-wrap items-center gap-2 border-border border-b px-4 py-3">
      <h1 className="mr-2 font-semibold text-screen tracking-tight">{t('users.title')}</h1>

      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
        <Input
          ref={searchRef}
          aria-label={t('users.searchAria')}
          placeholder={t('users.searchPlaceholder')}
          value={searchValue}
          className="h-9 min-w-24 flex-1 text-copy sm:w-56 sm:flex-none"
          onChange={(event) => onSearch(event.target.value)}
        />

        <UserFiltersPopover values={filters} onChange={onFilters} onReset={onResetFilters} />

        <CatalogColumnsMenu
          columns={columns}
          onToggle={onToggleColumn}
          onReset={onResetColumns}
          all={USER_COLUMNS}
          labels={USER_COLUMN_KEY}
          locked={USER_LOCKED_COLUMN}
        />
      </div>
    </header>
  )
}
